const express = require('express');
require('dotenv').config();
const http = require('http');
const WebSocket = require('ws');
const { Client } = require('ssh2');
const cors = require('cors');
const mysql = require('mysql2/promise');
const session = require('express-session');
const crypto = require('crypto');
const getFormattedTimestamp = require('./utils/dateUtil')
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16
const consoleTimeStamp = getFormattedTimestamp();



const corsOptions = {
  origin: 'http://localhost:3000', // Replace with your frontend's origin
  credentials: true, // Allow credentials (cookies, sessions) to be sent
};
const app = express();
app.use(
  session({
    secret: 'your-secret-key', // Change this to a strong secret key
    resave: false,
    saveUninitialized: true,
  })
);
const logRequest = async (req, res, next) => {
  if (req.originalUrl !== '/login') {
    const userId = req.session.userId || null;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const username = req.session.username || 'Guest';

    console.log(`[${consoleTimeStamp}] ${method} ${url} - User ID: ${userId} - Username: ${username}`);
    
    try {
      await pool.execute(
        'INSERT INTO user_activity_logs (user_id, timestamp, action_type, details) VALUES (?, ?, ?, ?)',
        [userId, timestamp, method, url]
      );
    } catch (error) {
      console.error('Error saving log to the database:', error);
    }
  }

  next();
};


app.use(logRequest);
app.use(cors(corsOptions));



const server = http.createServer(app);
const wss = new WebSocket.Server({ noServer: true });

const ssh = new Client();
const dbConfig = {
  host: 'localhost', // MySQL host
  user: 'root', // MySQL username
  database: 'ansibleui', // MySQL database name
};

const pool = mysql.createPool(dbConfig);

app.use(express.json());

function encrypt(text) {
  console.log('ENCRYPTION_KEY:', ENCRYPTION_KEY); // Debug line
  console.log('Key Length:', ENCRYPTION_KEY.length); // Debug line
  console.log('Buffer Length:', Buffer.from(ENCRYPTION_KEY, 'hex').length); // Debug line
  let iv = crypto.randomBytes(IV_LENGTH);
  let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  let textParts = text.split(':');
  let iv = Buffer.from(textParts.shift(), 'hex');
  let encryptedText = Buffer.from(textParts.join(':'), 'hex');
  let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
const requireRole = role => async (req, res, next) => {
  try {
    const userId = req.session.userId;
    
    // Retrieve the user's role from the database
    const [user] = await pool.execute('SELECT role_id FROM users WHERE id = ?', [userId]);
    
    // Match the role_id with the roles table and check against the required role
    if (!user || user.role_id !== role) {
      return res.status(403).json({ message: 'Permission Denied' });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

// Generate a random token
function generateAuthToken() {
  return crypto.randomBytes(32).toString('hex');
}
// Store SSH connections by user ID
const sshConnections = {};

// Utility function to connect SSH
// Utility function to connect SSH
async function connectSSH(userId, credentials) {
  return new Promise((resolve, reject) => {
    const ssh = new Client();
    ssh.connected = false; // Initialize the connected flag to false
    ssh.on('ready', () => {
      // console.log('SSH Connection Ready for user:', userId);
      ssh.connected = true; // Set the connected flag to true when connection is ready
      resolve(ssh);
    })
    .on('close', () => {
      console.log('SSH Connection Closed for user:', userId);
      ssh.connected = false; // Set the connected flag to false when connection is closed
    })
    .on('error', (err) => {
      console.error('SSH Connection Error for user:', userId, err);
      reject(err);
    })
    .connect({
      host: credentials.ip,
      port: 22,
      username: credentials.username,
      password: credentials.password
    });
  });
}


const isAuthenticated = (req, res, next) => {
  // console.log('Session Data:', req.session);  // Log session data
  if (req.session.userId) {
    return next();
  }
  res.status(401).send({ status: 'error', message: 'Unauthorized' });
};


// User registration route
app.post('/register', async (req, res) => {
  const { username, password, ip, vaultFileName, vaultPassword } = req.body;

  try {
    const encryptedVaultPassword = encrypt(vaultPassword);
    const [existingUser] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);

    if (existingUser.length > 0) {
      return res.status(400).send({ message: 'Username already exists' });
    }

    const authToken = generateAuthToken();

    // Log authToken for debugging
    console.log('Generated authToken:', authToken);

    // Ensure authToken is added to the INSERT query
    const [result] = await pool.execute(
      'INSERT INTO users (username, password, ip, authToken, vaultFileName, vaultPassword) VALUES (?, ?, ?, ?, ?, ?)',  
      [username, password, ip, authToken, vaultFileName, encryptedVaultPassword]  
    );

    if (result.affectedRows === 1) {
      req.session.authToken = authToken;
      // console.log('Session after registration:', req.session);  
      return res.send({ status: 'success', message: 'User registered successfully' });
    }
    res.status(500).send('Failed to register user');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


// User login route
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Log the incoming username and password for debugging

    // Retrieve user with the provided username
    const [user] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);

    // If no user is found or password is incorrect, send an error response
    if (user.length === 0 || user[0].password !== password) {
      return res.status(401).send({ status: 'error', message: 'Invalid credentials' });
    }

    // If authToken is missing, generate a new one
    if (!user[0].authToken) {
      console.log('authToken missing. Generating a new one.');
      user[0].authToken = generateAuthToken();
        
      // Update the database with the new authToken
      await pool.execute('UPDATE users SET authToken = ? WHERE id = ?', [user[0].authToken, user[0].id]);
    }

    // Set the authToken and userId in the session
    req.session.authToken = user[0].authToken;
    req.session.userId = user[0].id;
    req.session.username = user[0].username; // Adjust this to match your actual object structure
    
    // Log User Activity
    const method = req.method;
    const url = req.originalUrl;
    const userId = user[0].id;
    const timestamp = new Date().toISOString();


    console.log(`[${consoleTimeStamp}] ${method} ${url} - User ID: ${userId} - Username: ${username}`);

    try {
      // Log user activity
      await pool.execute(
        'INSERT INTO user_activity_logs (user_id, timestamp, action_type, details) VALUES (?, ?, ?, ?)',
        [userId, timestamp, method, url]
      );
    } catch (error) {
      console.error('Error saving log to the database:', error);
    }
    return res.send({ status: 'success', message: 'Login successful' });
    
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

app.post('/create-group', requireRole(1), async (req, res) => {
  const { groupName } = req.body;

  try {
    // Step 1: Create group in local database
    const [result] = await pool.execute('INSERT INTO groups (name) VALUES (?)', [groupName]);
    const localGroupId = result.insertId;

    // Step 2: Create group on remote server via SSH
    ssh.exec(`sudo groupadd ${groupName}`, (err, stream) => {
      if (err) {
        // If SSH command fails, delete the group from local database
        pool.execute('DELETE FROM groups WHERE id = ?', [localGroupId]);
        console.error(err);
        return res.status(500).json({ message: 'Failed to create group on remote server' });
      }

      stream.on('close', (code) => {
        if (code === 0) {
          res.status(201).json({ message: 'Group created successfully', groupId: localGroupId });
        } else {
          // If SSH command fails, delete the group from local database
          pool.execute('DELETE FROM groups WHERE id = ?', [localGroupId]);
          res.status(500).json({ message: 'Failed to create group on remote server' });
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error while creating group in local database' });
  }
});


app.post('/create-user', requireRole(1), async (req, res) => {
  const { username, password, groupName } = req.body;

  try {
    // Step 1: Create user in local database
    const [userResult] = await pool.execute(
      'INSERT INTO users (username, password, role_id) VALUES (?, ?, ?)',
      [username, password, 2] // assuming 2 is the role_id for regular users
    );
    const localUserId = userResult.insertId;

    // Step 2: Assign user to group in local database
    const [group] = await pool.execute('SELECT * FROM groups WHERE name = ?', [groupName]);
    if (group.length === 0) {
      throw new Error('Group not found');
    }
    await pool.execute('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)', [localUserId, group[0].id]);

    // Step 3: Create user on remote server via SSH and assign group
    ssh.exec(`sudo useradd -m -p $(openssl passwd -1 ${password}) ${username} && sudo usermod -aG ${groupName} ${username}`, (err, stream) => {
      if (err) {
        // If SSH command fails, delete the user and assignment from local database
        pool.execute('DELETE FROM users WHERE id = ?', [localUserId]);
        pool.execute('DELETE FROM user_groups WHERE user_id = ?', [localUserId]);
        console.error(err);
        return res.status(500).json({ message: 'Failed to create user on remote server' });
      }

      stream.on('close', (code) => {
        if (code === 0) {
          res.status(201).json({ message: 'User created and assigned to group successfully', userId: localUserId });
        } else {
          // If SSH command fails, delete the user and assignment from local database
          pool.execute('DELETE FROM users WHERE id = ?', [localUserId]);
          pool.execute('DELETE FROM user_groups WHERE user_id = ?', [localUserId]);
          res.status(500).json({ message: 'Failed to create user or assign group on remote server' });
        }
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error while processing user in local database' });
  }
});



// Get SSH credentials route
app.get('/get-ssh-credentials', async (req, res) => {
  // console.log('Current Session:', req.session); // Debugging line: Check what is in the session
  const authToken = req.session.authToken;

  if (!authToken) {
    return res.status(401).send({ status: 'error', message: 'Unauthorized - No authToken in session' }); // More descriptive error message
  }

  try {
    const [userData] = await pool.execute('SELECT * FROM users WHERE authToken = ?', [authToken]);
    if (userData.length !== 1) {
      return res.status(401).send({ status: 'error', message: 'Unauthorized - Invalid authToken' }); // More descriptive error message
    }
    const { ip, username, password } = userData[0];
    res.json({ ip, username, password });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});



// Check SSH connection route
app.get('/check-connection', isAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId;
    // console.log('Checking connection for user ID:', userId);

    if (!sshConnections[userId]) {
      // console.log('No existing SSH connection found for user ID:', userId);

      const [userData] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);
      if (userData.length !== 1) {
        return res.status(401).send({ status: 'error', message: 'Unauthorized' });
      }
      const credentials = { ip: userData[0].ip, username: userData[0].username, password: userData[0].password };
      sshConnections[userId] = await connectSSH(userId, credentials); // Store the SSH connection by user ID
    }
    if (sshConnections[userId].connected) {
      // console.log('SSH connection is active for user ID:', userId);

      return res.send({ status: 'success' });
    }
    console.log('SSH connection is NOT active for user ID:', userId);

    res.send({ status: 'error' });
  } catch (error) {
    console.error('Error in /check-connection endpoint:', error);

    console.error(error);
    res.send({ status: 'error' });
  }
});

// Execute playbook route
app.post('/run-playbook', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const { playbookPath } = req.body;

  try {
    // Retrieve encryptedVaultPassword and other necessary data from database for the given user
    const [userData] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);

    if (userData.length !== 1) {
      return res.status(401).send({ status: 'error', message: 'Unauthorized' });
    }

   
    const vaultFileName = userData[0].vaultFileName;
    // Ensure the SSH connection exists for this user
    if (!sshConnections[userId] || !sshConnections[userId].connected) {
      return res.status(500).send({ error: 'No SSH connection available' });
    }
    // Construct Ansible command with vaultFileName
    const command = `ansible-playbook ${playbookPath} -e @vault/${vaultFileName} --vault-password-file /home/${userData[0].username}/vault-pass.sh -i /home/${userData[0].username}/vars/inventory`;
    // console.log(`Executing command for ${userData[0].username}`)
    // console.log('command',command)
    console.log(`[${consoleTimeStamp}] - User ID: ${userId} - Command: ${command}`);
    // Execute Ansible command
    sshConnections[userId].exec(command, async (err, stream) => {
      if (err) {
        console.error('Failed to run playbook:', err);
        return res.status(500).send({ error: 'Failed to run playbook' });
      }
      
      let output = '';
      stream.on('data', (data) => {
        output += data.toString();
      });
      
      stream.stderr.on('data', (data) => {
        console.error(`STDERR: ${data}`);
      });
      stream.on('close', async (code, signal) => {
        if (code === 0) {
          // Playbook executed successfully
          res.send({ status: 'success', message: 'Playbook executed successfully', output: output });

          // Log playbook execution in the user_activity_logs table
          const timestamp = new Date().toISOString();
          const actionType = 'POST';
          const details = req.originalUrl;
          const commandRan = command
          const dataReceived = output
          try {
            await pool.execute(
              'INSERT INTO user_activity_logs (user_id, timestamp, action_type, details, commandRan, dataReceived) VALUES (?, ?, ?, ?, ?, ?)',
              [userId, timestamp, actionType, details, commandRan, dataReceived]
            );
          } catch (error) {
            console.error('Error saving playbook execution log to the database:', error);
          }
        } else {
          // Playbook execution failed
          res.status(500).send({ error: `Playbook execution failed with code: ${code}`, output: output });

          // Log playbook execution failure in the user_activity_logs table
          const timestamp = new Date().toISOString();
          const actionType = 'Playbook Execution Failed';
          const details = `Playbook Path: ${playbookPath}\nOutput:\n${output}`;
          const commandRan = command;
          const dataReceived = output;

          try {
            await pool.execute(
              'INSERT INTO user_activity_logs (user_id, timestamp, action_type, details, commandRan, dataReceived) VALUES (?, ?, ?, ?, ?, ?)',
              [userId, timestamp, actionType, details, commandRan, dataReceived]
            );
          } catch (error) {
            console.error('Error saving playbook execution failure log to the database:', error);
          }
        }
      });
    });
  } catch (error) {
    console.error('Error while executing playbook:', error);
    res.status(500).send({ error: 'Internal server error while executing playbook' });
  }
});




app.post('/playbook-paths', isAuthenticated, async (req, res) => {
  const { blockId, path } = req.body;
  try {
    const [result] = await pool.execute('INSERT INTO playbook_paths (block_id, path) VALUES (?, ?)', [blockId, path]);
    res.status(201).json({ id: result.insertId, path });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


app.post('/block', isAuthenticated, async (req, res) => {
  console.log('Received POST request at /api/block');
  try {
    console.log('POST request received at /api/blocks');
    console.log('Session:', req.session);
    console.log('Request Body:', req.body);

    const userId = req.session.userId;
    const { name } = req.body;
    
    if (!userId || !name) {
      console.error('Missing userId or block name');
      return res.status(400).send('Bad Request: Missing userId or block name');
    }
    
    const [result] = await pool.execute(
      'INSERT INTO blocks (user_id, name) VALUES (?, ?)', [userId, name]
    );
    
    if (result.affectedRows === 0) {
      console.error('Failed to insert block into database');
      return res.status(500).send('Internal Server Error: Failed to insert block');
    }

    console.log('Block inserted with ID:', result.insertId);
    res.status(201).json({ id: result.insertId, name });
    
  } catch (error) {
    console.error('Error handling /api/blocks POST request:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/blocks', isAuthenticated, async (req, res) => {
  console.log('Received Get request at /api/block');
  const userId = req.session.userId;
  try {
    const [blocks] = await pool.execute('SELECT * FROM blocks WHERE user_id = ?', [userId]);
    for (const block of blocks) {
      const [paths] = await pool.execute('SELECT * FROM playbook_paths WHERE block_id = ?', [block.id]);
      // Include both path and path ID in the response
      block.playbookPaths = paths.map(p => ({ id: p.id, path: p.path }));
    }
    res.json(blocks);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


// Delete a block endpoint
app.delete('/block/:blockId', isAuthenticated, async (req, res) => {
  try {
    const { blockId } = req.params;
    const userId = req.session.userId;

    // First, verify that the block belongs to the authenticated user
    const [block] = await pool.execute('SELECT * FROM blocks WHERE id = ? AND user_id = ?', [blockId, userId]);
    
    if (block.length === 0) {
      return res.status(404).send({ message: 'Block not found or you do not have permission to delete this block' });
    }

    // Delete associated paths first
    await pool.execute('DELETE FROM playbook_paths WHERE block_id = ?', [blockId]);

    // Then delete the block itself
    await pool.execute('DELETE FROM blocks WHERE id = ?', [blockId]);
    
    res.status(200).send({ message: 'Block deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});

// Delete a playbook path endpoint
app.delete('/playbook-paths/:pathId', isAuthenticated, async (req, res) => {
  try {
    const pathId = req.params.pathId;
    const userId = req.session.userId;

    // Debugging logs
    console.log('jsbsdj',req)
    console.log('Received pathId:', pathId);
    console.log('Authenticated userId:', userId);

    // Ensure pathId is a number
    const numericPathId = Number(pathId);
    if (isNaN(numericPathId)) {
      return res.status(400).send({ message: 'Invalid pathId' });
    }

    // Verify that the path belongs to the authenticated user
    const [path] = await pool.execute(`
      SELECT p.* FROM playbook_paths p
      JOIN blocks b ON p.block_id = b.id
      WHERE p.id = ? AND b.user_id = ?
    `, [numericPathId, userId]);

    // Debugging log
    console.log('Path found:', path);

    if (path && path.length === 0) {
      return res.status(404).send({ message: 'Path not found or you do not have permission to delete this path' });
    }

    // Proceed with deletion
    await pool.execute('DELETE FROM playbook_paths WHERE id = ?', [numericPathId]);
    
    res.status(200).send({ message: 'Path deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
});


// User logout route
app.post('/logout', async (req, res) => {
  const authToken = req.session.authToken;

  // If there's no authToken, then there's no session
  if (!authToken) {
    return res.status(400).send({ status: 'error', message: 'Not logged in' });
  }

  try {
    // Invalidate authToken in database
    // By setting the authToken to NULL, or you can also set it to some invalid value
    // Depending on how you want to handle it
    const [result] = await pool.execute(
      'UPDATE users SET authToken = NULL WHERE authToken = ?',
      [authToken]
    );

    if (result.affectedRows === 0) {
      // No user was found with the provided authToken
      // Could be an error state or the user is already logged out
      return res.status(400).send({ status: 'error', message: 'Invalid session' });
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).send({ status: 'error', message: 'Failed to logout, try again' });
      }

      // Successfully logged out and invalidated authToken
      return res.status(200).send({ status: 'success', message: 'Logged out successfully' });
    });
    
  } catch (error) {
    console.error(error);
    return res.status(500).send({ status: 'error', message: 'Internal server error' });
  }
});

app.get('/fetch-playbook', isAuthenticated, async (req, res) => {
  const userId = req.session.userId;
  const playbookPath = req.query.path;  // Get playbook path from query parameter

  if (!playbookPath) {
    return res.status(400).send({ error: 'Missing playbook path' });
  }

  try {
    // Retrieve necessary data from database for the given user
    const [userData] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);

    if (userData.length !== 1) {
      return res.status(401).send({ status: 'error', message: 'Unauthorized' });
    }

    // Ensure the SSH connection exists for this user
    if (!sshConnections[userId] || !sshConnections[userId].connected) {
      return res.status(500).send({ error: 'No SSH connection available' });
    }

    // Execute cat command over SSH to fetch playbook content
    const command = `cat ${playbookPath}`;
    sshConnections[userId].exec(command, (err, stream) => {
      if (err) {
        console.error('Failed to run cat command:', err);
        return res.status(500).send({ error: 'Failed to run cat command' });
      }
      
      let content = '';
      stream.on('data', (data) => {
        content += data.toString();
      });
      
      stream.stderr.on('data', (data) => {
        console.error(`STDERR: ${data}`);
      });
      
      stream.on('close', (code, signal) => {
        if(code === 0) {
          res.send({ status: 'success', content: content });
        } else {
          res.status(500).send({ error: `Cat command failed with code: ${code}` });
        }
      });
    });
  } catch (error) {
    console.error('Error while fetching playbook:', error);
    res.status(500).send({ error: 'Internal server error while fetching playbook' });
  }
});


server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

server.listen(3001, () => {
  console.log('Server is listening on port 3001');
});

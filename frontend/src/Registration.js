import React, { useState } from 'react';
import axios from 'axios';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [ip, setIP] = useState('');
  const [vaultFileName, setVaultFileName] = useState('');
  const [vaultPassword, setVaultPassword] = useState('');

  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Added vaultFileName to the POST data
      const response = await axios.post('/api/register', { username, password, ip, vaultFileName, vaultPassword });       
      if (response.data.status === 'success') {
        setStatus('Registration successful');
      } else {
        setStatus('Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatus('Registration failed');
      setErrorMessage(error.response?.data?.message || 'An error occurred during registration');
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        
        <br />
        <label>
          SSH Username:
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <br />
        <label>
          SSH Password:
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <br />
        <label>
          SSH Server IP:
          <input type="text" value={ip} onChange={(e) => setIP(e.target.value)} required />
        </label>
        <br />
        <label>  {/* Added input field for vaultFileName */}
          Vault File Name:
          <input type="text" value={vaultFileName} onChange={(e) => setVaultFileName(e.target.value)} required />
        </label>
        <label>
  Vault Password:
  <input type="password" value={vaultPassword} onChange={(e) => setVaultPassword(e.target.value)} required />
</label>
        <br />
        <button type="submit">Register</button>
      </form>
      {status && <p>{status}</p>}
      {errorMessage && <p>Error: {errorMessage}</p>}
    </div>
  );
}

export default Register;

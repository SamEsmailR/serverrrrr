// usePlaybook.js
import React, { useEffect, useState } from 'react';

export const usePlaybook = (initialPath) => {
  const [output, setOutput] = useState('');
  const [path, setPath] = useState(initialPath);
  const [credentials, setCredentials] = useState({});

  useEffect(() => {
    fetch('/api/get-ssh-credentials', {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => setCredentials(data))
      .catch((error) => console.error('Error fetching SSH credentials:', error));
  }, []);
  const executePlaybook = (playbookPath) => {
    console.log(playbookPath); // Log received argument
  // setPath(playbookPath);
  // console.log(path);
    // Trigger fetch call here to execute the playbook
    console.log(`Received playbook path: ${playbookPath}`);
    console.log(`Received credentials: ${JSON.stringify(credentials)}`);
    fetch('/api/run-playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookPath: playbookPath, ...credentials }),
      
    })
    
      .then((response) => response.json())
      .then((data) => setOutput(data.playbookOutput))
      .catch((error) => console.error('Error running playbook:', error));
  };

  return { output, executePlaybook };
};

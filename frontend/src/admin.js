import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios'; // You might need to install this package

// Styled components
const Container = styled.div`
  padding: 20px;
`;

const Input = styled.input`
  padding: 10px;
  margin: 10px 0;
`;

const Button = styled.button`
  padding: 10px 20px;
  margin: 10px 0;
`;

function AdminPage() {
  const [groups, setGroups] = useState([]);
  const [newGroup, setNewGroup] = useState('');
  const [newUser, setNewUser] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  // Fetch existing groups on component mount
  useEffect(() => {
    axios.get('/api/get-groups')
      .then(response => setGroups(response.data))
      .catch(error => console.error('Error fetching groups:', error));
  }, []);

  // Handler for creating a new group
  const handleCreateGroup = () => {
    axios.post('/api/create-group', { groupName: newGroup })
      .then(response => {
        setGroups([...groups, response.data]);
        setNewGroup(''); // Reset input field
      })
      .catch(error => console.error('Error creating group:', error));
  };

  // Handler for creating a new user and assigning to a group
  const handleCreateUser = () => {
    axios.post('/api/create-user', { username: newUser, groupName: selectedGroup })
      .then(response => {
        setNewUser(''); // Reset input field
      })
      .catch(error => console.error('Error creating user:', error));
  };

  return (
    <Container>
      <h1>Admin Page</h1>

      {/* Create Group Section */}
      <div>
        <h2>Create Group</h2>
        <Input
          type="text"
          placeholder="New Group Name"
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
        />
        <Button onClick={handleCreateGroup}>Create Group</Button>
      </div>

      {/* Create User Section */}
      <div>
        <h2>Create User</h2>
        <Input
          type="text"
          placeholder="New Username"
          value={newUser}
          onChange={(e) => setNewUser(e.target.value)}
        />
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          {groups.map(group => (
            <option key={group.id} value={group.name}>{group.name}</option>
          ))}
        </select>
        <Button onClick={handleCreateUser}>Create User and Assign Group</Button>
      </div>
    </Container>
  );
}

export default AdminPage;

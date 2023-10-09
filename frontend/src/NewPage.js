import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Modal from './modal';
import OutputBox from './OutputBox';
import Sidebar from './Sidebar';


const NewPageContainer = styled.div`
  display: flex;
  background-color: #f4f4f4;  // light grey background for contrast
  height: 100vh;
`;

const NewContent = styled.div`
  margin: 20px;
  flex-grow: 1;
  background-color: #fff;  // white content area
  border-radius: 10px;  // rounded corners
  padding: 20px;  // internal spacing
  box-shadow: 0px 0px 15px 1px rgba(0, 0, 0, 0.2);  // subtle shadow for depth
`;
const Container = styled.div`
  padding: 20px;
`;

const Table = styled.div`
  width: 100%;
  display: table;
  margin-top: 20px;
  border-collapse: collapse;
`;

const TableRow = styled.div`
  display: table-row;
  &:nth-child(even) {
    background-color: #f2f2f2;  // Adjust colors as needed
  }
`;

const TableCell = styled.div`
  padding: 10px 20px;
  display: table-cell;
  border-bottom: 1px solid #ddd;  // Adjust border styling as needed
`;

const HeaderCell = styled(TableCell)`
  font-weight: bold;
  background-color: #4CAF50;  // Adjust header background color as needed
  color: white;
`;
// const Container = styled.div`
//   padding: 20px;
//   display: flex;
//   flex-direction: column;
//   align-items: center;
// `;

const BlocksContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
`;

const Block = styled.div`
  margin: 20px;
  padding: 10px;
  border: 1px solid black;
  cursor: pointer;
`;

const BlockContent = styled.div`
  margin-top: 10px;
`;

const BlockHeader = styled.h3`
  margin: 0;
  padding: 0;
  color: #333;
`;

const Button = styled.button`
  margin: 10px;
  padding: 10px 15px;
  border: none;
  color: #fff;
  background-color: #007bff;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;

const DeleteButton = styled.button`
  margin-left: 10px;
  padding: 5px 10px;
  border: none;
  color: #fff;
  background-color: #ff0000;

  &:hover {
    background-color: #cc0000;
  }
`;

const PlaybookPath = styled.div`
  margin: 10px;
  display: flex;
  align-items: center;
`;
const RunButton = styled.button`
  padding: 5px 10px;
  margin-left: 5px;
  background-color: #007bff;
  color: #fff;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: #0056b3;
  }
`;
const DeletePathButton = styled.button`
  padding: 5px 10px;
  margin-left: 5px;
  background-color: #ff0000;
  color: #fff;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: #cc0000;
  }
`;

function NewPage() {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlockId, setSelectedBlockId] = useState(null);
  const [playbookOutput, setPlaybookOutput] = useState('');
  const [credentials, setCredentials] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/get-ssh-credentials', {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('SSH Credentials received:', data);
        setCredentials(data);
      })
      .catch((error) => console.error('Error fetching SSH credentials:', error));

    fetch('/api/blocks', {
      method: 'GET',
      credentials: 'include',
    })
      .then((response) => response.json())
      .then((data) => {
        console.log('Blocks received:', data);
        if (Array.isArray(data)) { // Checking if data is an array before setting the state
          setBlocks(data);
        } else {
          console.error('Expected an array but received:', data);
          setBlocks([]); // Optional: Set default value to an empty array or handle accordingly
        }
      })
      .catch((error) => console.error('Error fetching user blocks:', error));
  }, []);


  const addBlock = async () => {
    try {
      const newBlockName = prompt('Enter name for new block:');
      if (newBlockName) {
        const response = await fetch('/api/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newBlockName }),
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        setBlocks(prevBlocks => [...prevBlocks, data]);
      }
    } catch (error) {
      console.error('Error adding new block:', error);
    }
  };


  const addPlaybookPath = (blockId) => {
    const newPath = prompt('Enter playbook path:');
    if (newPath) {
      fetch('/api/playbook-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockId, path: newPath }),
        credentials: 'include',
      })
      .then(response => response.json())
      .then(data => {
        setBlocks(prevBlocks => {
          return prevBlocks.map(block => {
            if (block.id === blockId) {
              // you might need to adjust how you add new paths based on the response structure
              return { ...block, playbookPaths: [...(block.playbookPaths || []), data] };
            }
            return block;
          });
        });
      })
      .catch((error) => console.error('Error adding playbook path:', error));
    }
  };
  

  const runPlaybook = (playbookPath) => {
    fetch('/api/run-playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookPath, ...credentials }),
    })
      .then((response) => response.json())
      .then((data) => {
        setPlaybookOutput(data.output);
        setIsModalOpen(true);
      })
      .catch((error) => console.error('Error running playbook:', error));
  };
  const deleteBlock = async (blockId) => {
    try {
      const confirmation = window.confirm('Are you sure you want to delete this block?');
      if (!confirmation) return;

      const response = await fetch(`/api/block/${blockId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      // Update blocks state to remove the deleted block
      setBlocks(blocks.filter(block => block.id !== blockId));
    } catch (error) {
      console.error('Error deleting block:', error);
    }
  };

  const deletePlaybookPath = (blockId, pathId, pathIndex) => {
    try {
      const confirmation = window.confirm('Are you sure you want to delete this playbook path?');
      if (!confirmation) return;

      console.log("Frontend pathId:", pathId); // Logging the pathId here

      fetch(`/api/playbook-paths/${pathId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      // handle the rest accordingly
    } catch (error) {
      console.error('Error deleting playbook path:', error);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const selectBlock = (blockId) => {
    setSelectedBlockId(blockId === selectedBlockId ? null : blockId);
  };

  
  return (

    <NewPageContainer>
          <Sidebar />

<NewContent>
        <Button onClick={addBlock}>Add Block</Button>
      <Table>
        <TableRow>
          <HeaderCell>Block Name</HeaderCell>
          <HeaderCell>Playbook Paths</HeaderCell>
          <HeaderCell>Actions</HeaderCell>
        </TableRow>
        {blocks.map((block) => (
          <TableRow key={block.id}>
            <TableCell>{block.name}</TableCell>
            <TableCell>
            {(block.playbookPaths || []).map((pathObj, pIndex) => (
                <PlaybookPath key={pIndex}>
                  {pathObj.path} 
                  <RunButton onClick={() => runPlaybook(pathObj.path)}>Run</RunButton>
                  <DeletePathButton onClick={() => deletePlaybookPath(block.id, pathObj.id)}>
                    Delete Path
                  </DeletePathButton>
                </PlaybookPath>
                
              ))}
            </TableCell>
            <TableCell>
              <DeleteButton onClick={() => deleteBlock(block.id)}>Delete Block</DeleteButton>
              <Button onClick={() => addPlaybookPath(block.id)}>Add Playbook Path</Button>
            </TableCell>
          </TableRow>
        ))}
      </Table>
      {isModalOpen && (
        <Modal onClose={closeModal}>
          <OutputBox output={playbookOutput} />
        </Modal>
      )}    
      </NewContent>
      </NewPageContainer>
  );
}

export default NewPage;
import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import OutputBox from './OutputBox';
import styled from 'styled-components';


const Box = styled.div`
  width: 48%;  // each box takes up 48% of the width of their container
  margin-right: 2%;  // 2% right margin for the left box
  background-color: #1E1E1E; // Example color, adjust as necessary
  color: #FFFFFF; // Example color, adjust as necessary
  padding: 10px;
  border-radius: 5px;
  overflow-y: auto; // Add scrolling to box if content is too long
  maxHeight: 400px; // You might want to set a maximum height
`;

const PlaybookContentBox = styled(Box)``;
// const OutputBox = styled(Box)``;
const DashboardContainer = styled.div`
  display: auto;
  background-color: #f4f4f4;  // light grey background for contrast
  height: 100vh;
`;
const FetchButton = styled.button`
  background-color: #6c757d;  // grey background for distinction
  color: #fff;  // white text
  padding: 10px 20px;  // vertical and horizontal padding
  border: none;  // remove default border
  border-radius: 5px;  // rounded corners
  cursor: pointer;  // pointer cursor on hover
  margin-left: 10px;  // spacing from the RunButton
  &:hover {
    background-color: #5a6268;  // darker grey on hover
  }
`;

// const PlaybookContentBox = styled.div`
//   // Add styling for your playbook content box here
//   padding: 10px;
//   border: 1px solid #ddd;
//   margin-right: 10px; // Adjust as needed
//   width: 45%; // Adjust width as needed
//   overflow-y: auto; // Add scroll if content is too long
//   // ... add other styles as needed ...
// `;


const Content = styled.div`
  margin: 20px;
  flex-grow: 1;
  background-color: #fff;  // white content area
  border-radius: 10px;  // rounded corners
  padding: 20px;  // internal spacing
  box-shadow: 0px 0px 15px 1px rgba(0, 0, 0, 0.2);  // subtle shadow for depth
`;

const StatusIndicator = styled.span`
  color: ${props => props.isConnected ? '#28a745' : '#dc3545'};  // green or red text
  font-size: 24px;
  margin-left: 10px;
  font-weight: bold;  // bold text for emphasis
`;

const ConnectionButton = styled.button`
  background-color: #007bff;  // blue background
  color: #fff;  // white text
  padding: 10px 20px;  // vertical and horizontal padding
  border: none;  // remove default border
  border-radius: 5px;  // rounded corners
  cursor: pointer;  // pointer cursor on hover
  margin-left: 10px;  // spacing from the status indicator
  &:hover {
    background-color: #0056b3;  // darker blue on hover
  }
`;

const PlaybookInput = styled.input`
  padding: 10px;  // internal spacing
  width: 60%;  // occupy 60% of the container width
  border: none;  // remove default border
  border-bottom: 2px solid #007bff;  // underline effect
  margin-right: 10px;  // spacing between input and button
  &:focus {
    outline: none;  // remove focus outline
    border-bottom-color: #0056b3;  // change underline color on focus
  }
`;

const RunButton = styled.button`
  background-color: #28a745;  // green background
  color: #fff;  // white text
  padding: 10px 20px;  // vertical and horizontal padding
  border: none;  // remove default border
  border-radius: 5px;  // rounded corners
  cursor: pointer;  // pointer cursor on hover
  margin-right: 10px;  // ADD THIS LINE
  &:hover {
    background-color: #218838;  // darker green on hover
  }
`;





function Dashboard() {
  const [connectionStatus, setConnectionStatus] = useState('pending');
  const [playbookPath, setPlaybookPath] = useState('');
  const [playbookOutput, setPlaybookOutput] = useState('');
  const [credentials, setCredentials] = useState({});
  const [playbookContent, setPlaybookContent] = useState('');
  const [loading, setLoading] = useState(false);



  // useEffect(() => {
  //   fetch('/api/get-ssh-credentials', {
  //     method: 'GET',
  //     credentials: 'include',
  //   })
  //     .then((response) => response.json())
  //     .then((data) => setCredentials(data))
  //     .catch((error) => console.error('Error fetching SSH credentials:', error));
  // }, []);
  const fetchPlaybook = () => {
    setLoading(true);
    fetch(`/api/fetch-playbook?path=${playbookPath}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        setPlaybookContent(data.content);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching playbook:', err);
        setLoading(false);
      });
  };

  const checkConnection = () => {
    fetch('/api/check-connection', {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => setConnectionStatus(data.status === 'success' ? 'connected' : 'not connected'))
      .catch((err) => setConnectionStatus('not connected'));
  };

  const runPlaybook = () => {
    setLoading(true);
    fetch('/api/run-playbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playbookPath, ...credentials }),
    })
      .then((response) => response.json())
      .then((data) => {
        setPlaybookOutput(data.output);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error running playbook:', error);
        setLoading(false);
      });
  };

  return (
    <DashboardContainer>
      <Sidebar />
      <Content>
        <div>
          Connection Status:
          <StatusIndicator isConnected={connectionStatus === 'connected'}>
            {connectionStatus}
          </StatusIndicator>
          <ConnectionButton onClick={checkConnection}>
            Check Connection
          </ConnectionButton>
          <p>/home/gshukla/playbooks/nslookup.yaml</p>
        </div>
        <div style={{ marginTop: '20px' }}>
          <PlaybookInput
            type="text"
            value={playbookPath}
            onChange={(e) => setPlaybookPath(e.target.value)}
            placeholder="Enter playbook path"
          />
          <RunButton onClick={runPlaybook}>Run Playbook</RunButton>
          <FetchButton onClick={fetchPlaybook}>Fetch Playbook</FetchButton> {/* ensure you have an appropriate onClick handler */}
        </div>

      <div style={{ display: 'flex', flexDirection: 'column', marginTop: '20px' }}>
        {playbookContent &&
          <div style={{ marginBottom: '1%', backgroundColor: '#1E1E1E', color: '#FFFFFF', padding: '10px', borderRadius: '5px', overflowY: 'auto', maxHeight: '400px', wordBreak: 'break-word' }}>
            <pre>{playbookContent}</pre>
          </div>
        }
        {playbookOutput &&
          <div style={{ marginTop: playbookContent ? '1%' : '0%', backgroundColor: '#1E1E1E', color: '#FFFFFF', padding: '10px', borderRadius: '5px', overflowY: 'auto', maxHeight: '400px', wordBreak: 'break-word' }}>
            <OutputBox output={playbookOutput} />
          </div>
        }
      </div>
    </Content>
    </DashboardContainer>
  );
}

export default Dashboard;
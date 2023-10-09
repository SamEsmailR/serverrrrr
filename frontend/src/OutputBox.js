import React from 'react';

const OutputBox = ({ output }) => {
  if (!output) return null;

  const styleOutput = (output) => {
    const errorStyle = { color: '#FF5733' }; // Choose your own error color
    const warningStyle = { color: '#FFC300' }; // Choose your own warning color
    const successStyle = { color: '#33FF57' }; // Choose your own success color
    const defaultStyle = { color: '#FFFFFF' }; // Default text color

    return output.split('\n').map((line, index) => {
      let style = defaultStyle;
      if (line.toLowerCase().includes('error')) {
        style = successStyle;
      } else if (line.toLowerCase().includes('warning')) {
        style = successStyle;
      } else if (line.toLowerCase().includes('ok')) {
        style = successStyle;
      }

      return (
        <span key={index} style={style}>
          {line}
          <br />
        </span>
      );
    });
  };

  return (
    <div
      style={{
        marginTop: '20px',
        padding: '10px',
        borderRadius: '5px', // Add rounded corners
        border: '1px solid #666666', // You can adjust the border color
        backgroundColor: '#1E1E1E', // Dark background color
        color: '#FFFFFF',
        fontFamily: 'monospace',
        fontSize: '14px', // Adjust font size
        whiteSpace: 'pre-wrap',
        overflowY: 'scroll', // Add scroll if content is too long
        maxHeight: '400px', // Maximum height of the box
      }}
    >
      {styleOutput(output)}
    </div>
  );
};

export default OutputBox;
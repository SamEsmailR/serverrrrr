import React from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ModalContainer = styled.div`
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 100%; // Set to your desired width
  text-align: center;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 1.5em;
  cursor: pointer;
`;

const Modal = ({ children, onClose }) => (
  <Overlay>
    <ModalContainer>
      <CloseButton onClick={onClose}>&times;</CloseButton>
      {children}
    </ModalContainer>
  </Overlay>
);

export default Modal;

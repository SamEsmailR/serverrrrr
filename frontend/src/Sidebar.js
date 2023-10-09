import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';

const Navbar = styled.div`
  background-color: #333;
  height: 60px;
  display: flex;
  justify-content: start;
  align-items: center;
`;

const MenuButton = styled.button`
  margin-left: 20px;
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Bar = styled.div`
  background-color: #fff;
  margin: 3px 0;
  padding: 2px 20px;
  border-radius: 3px;
  width: 25px;
  transition: 0.3s ease-in-out;

  &:nth-child(2) {
    width: ${({ sidebar }) => (sidebar ? '70%' : '100%')};
  }

  &:nth-child(3) {
    transform: ${({ sidebar }) => (sidebar ? 'rotate(-45deg) translate(5px, 6px)' : 'none')};
  }

  &:nth-child(1) {
    transform: ${({ sidebar }) => (sidebar ? 'rotate(45deg) translate(5px, -6px)' : 'none')};
  }
`;

const Nav = styled.nav`
  background-color: #333;
  width: 250px;
  height: 100vh;
  display: flex;
  justify-content: center;
  position: fixed;
  top: 0;
  left: ${({ sidebar }) => (sidebar ? '0' : '-100%')};
  transition: 350ms;
  z-index: 10;
  transition: transform 0.3s ease-in-out;
  transform: ${({ sidebar }) => (sidebar ? 'translateX(0)' : 'translateX(-100%)')};
`;
const NavList = styled.ul`
  width: 100%;
  padding: 20px 0;
  list-style: none;
  padding-top: 60px;
`;
const LogoutButton = styled.button`
  background-color: red;
  color: white;
  padding: 10px;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: darkred;
  }
`;

const NavItem = styled.li`
  width: 100%;
  height: 80px;
  display: flex;
  justify-content: start;
  align-items: center;
  padding-left: 30px;
  transition: 200ms;

  &:hover {
    background-color: #575757;
  }
`;

const LinkText = styled(NavLink)`
  text-decoration: none;
  color: #fff;
  font-size: 18px;

  &:hover {
    color: #1f90ff;
  }
`;

const handleLogout = () => {
  // Call your API endpoint to log out
  fetch('/api/logout', {  // Adjust this URL to the actual endpoint you have for logout
    method: 'POST', // Use the method your endpoint expects (GET, POST, etc.)
    credentials: 'include', // Necessary to include cookies (session data)
    headers: {
      'Content-Type': 'application/json',
      // Include any other headers your application needs
    },
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok ' + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    console.log('User logged out', data);

    // Here you might want to clear any user-related data in your app's state or Redux store, etc.
    // dispatch({ type: 'USER_LOGOUT' });  // Example if you are using Redux

    // Redirect user to login page or wherever you want them to go after logout
    window.location.href = "/login";  // Adjust if using react-router or another routing library
  })
  .catch(error => {
    console.error('Error during logout', error);
    // Notify the user or handle the logout error in another appropriate way
  });
};



const Sidebar = () => {
  const [sidebar, setSidebar] = useState(false);
  const sidebarRef = useRef();

  const showSidebar = () => setSidebar(!sidebar);

  const handleClickOutside = (event) => {
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setSidebar(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [sidebar]);


  return (
    <div>
      <Navbar>
        <MenuButton onClick={showSidebar}>
          <Bar sidebar={sidebar}></Bar>
          <Bar sidebar={sidebar}></Bar>
          <Bar sidebar={sidebar}></Bar>
        </MenuButton>
      </Navbar>
      <Nav ref={sidebarRef} sidebar={sidebar}>
        <NavList>
          <NavItem>
            <MenuButton onClick={showSidebar}>
              <i className='fas fa-bars'></i>
            </MenuButton>
          </NavItem>
          <NavItem>
            <LinkText to="/dashboard">Dashboard</LinkText>
          </NavItem>
          <NavItem>
            <LinkText to="/newpage">Playbooks</LinkText>
          </NavItem>
          <NavItem>
          <LogoutButton onClick={handleLogout}>Logout</LogoutButton>
        </NavItem>

        </NavList>
      </Nav>
    </div>
  );
};

export default Sidebar;
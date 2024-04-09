import styled from 'styled-components'

export const Container = styled.div`
  width: 350px;
  background: rgba(0,0,0,0.85);
  padding: 1em;
  position: absolute;
  top: 75%;
  left: 75%;
  animation: fade-in .22s ease-in-out;
  box-shadow: 0 0 3px black;
  user-select: none;
  img {
    width: 80px;
    margin-right: 1em;
    user-select: none;
  }
  p {
    margin: 0;
  }
`
export const Contenr = styled.div`
  display: flex;
  height: 80px;
  align-items: center;
  margin-bottom: 1em';
`
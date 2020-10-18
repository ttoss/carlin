/** @jsx jsx */
import { jsx } from 'theme-ui';

import MaxWidth from './MaxWidth';

const Header = () => {
  return (
    <header
      sx={{
        height: '100px',
        backgroundColor: 'black',
      }}
    >
      <MaxWidth
        sx={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <span sx={{ color: 'white', fontSize: 5 }}>Carlin</span>
      </MaxWidth>
    </header>
  );
};

export default Header;

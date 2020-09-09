import { Container, SxProps } from 'theme-ui';

const MaxWidth: React.FC<SxProps> = ({ children }) => {
  return <Container sx={{ maxWidth: '60em' }}>{children}</Container>;
};

export default MaxWidth;

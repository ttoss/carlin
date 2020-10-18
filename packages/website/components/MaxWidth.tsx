import { Container, SxProps } from 'theme-ui';

const MaxWidth: React.FC<SxProps & { className?: string }> = ({
  children,
  className,
}) => {
  return (
    <Container className={className} sx={{ maxWidth: '60em' }}>
      {children}
    </Container>
  );
};

export default MaxWidth;

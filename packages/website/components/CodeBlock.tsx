/** @jsx jsx */
import Prism from '@theme-ui/prism';
import { jsx } from 'theme-ui';

const CodeBlock: React.FC<{ className?: string }> = ({
  children,
  className = 'sh',
}) => {
  return (
    <Prism sx={{ overflowX: 'auto' }} className={className}>
      {children}
    </Prism>
  );
};

export default CodeBlock;

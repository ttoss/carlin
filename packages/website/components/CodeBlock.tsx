/** @jsx jsx */
import Prism from '@theme-ui/prism';
import { jsx } from 'theme-ui';

const CodeBlock: React.FC<{ className?: string; maxHeight?: boolean }> = ({
  children,
  className = 'sh',
  maxHeight = true,
}) => {
  return (
    <Prism
      sx={{
        overflow: 'auto',
        maxHeight: maxHeight ? '1300px' : undefined,
        marginY: 3,
      }}
      className={className}
    >
      {children}
    </Prism>
  );
};

export default CodeBlock;

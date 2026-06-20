import React from 'react';
import { Button } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface BigButtonProps {
  type?: 'primary' | 'secondary' | 'success' | 'warning';
  size?: 'normal' | 'large';
  block?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export default function BigButton({
  type = 'primary',
  size = 'normal',
  block = false,
  disabled = false,
  onClick,
  children
}: BigButtonProps) {
  return (
    <Button
      className={classnames(
        styles.bigButton,
        styles[type],
        size === 'large' && styles.large,
        block && styles.block,
        disabled && styles.disabled
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

import React from 'react';
import { ICON_PATHS } from '../constants';

interface IconProps {
    name: string;
    size?: number;
    className?: string;
    [key: string]: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 20, className = "", ...props }) => {
    const content = ICON_PATHS[name];
    if (!content) return <span style={{ width: size, height: size, display: 'inline-block', background: '#eee', borderRadius: '50%' }}></span>;
    
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {content}
        </svg>
    );
};

export default Icon;
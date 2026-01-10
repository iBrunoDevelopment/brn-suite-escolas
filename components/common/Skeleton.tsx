
import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'rect' | 'circle';
    width?: string | number;
    height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect', width, height }) => {
    const baseClass = "bg-slate-700/50 animate-pulse";

    let variantClass = "rounded-lg";
    if (variant === 'circle') variantClass = "rounded-full";
    if (variant === 'text') variantClass = "rounded h-4 mb-2";

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || (variant === 'text' ? undefined : '100%'),
    };

    return (
        <div
            className={`${baseClass} ${variantClass} ${className}`}
            style={style}
        />
    );
};

export default Skeleton;

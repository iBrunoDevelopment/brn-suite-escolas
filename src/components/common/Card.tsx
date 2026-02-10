import React from 'react';
import classNames from 'classnames';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    animate?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className, onClick, animate = true }) => {
    return (
        <div
            onClick={onClick}
            className={classNames(
                "bg-card-dark border border-white/5 rounded-3xl overflow-hidden",
                animate && "animate-in fade-in zoom-in duration-500",
                onClick && "cursor-pointer hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5",
                className
            )}
        >
            {children}
        </div>
    );
};

export default Card;

import React from "react";

const Skeleton = ({ className }) => {
    return (
        <div className={`bg-slate-200 animate-pulse rounded-lg ${className}`}></div>
    );
};

export default Skeleton;

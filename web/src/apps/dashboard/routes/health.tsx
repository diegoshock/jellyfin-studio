import React from 'react';
import { Navigate } from 'react-router-dom';

export default function Health() {
    return <Navigate replace to='/dashboard' />;
}

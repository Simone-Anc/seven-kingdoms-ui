import React from 'react';
import { useAuth } from '../context/AuthContext';
import './ProfileScreen.css';

interface Props {
  onClose: () => void;
}

export const ProfileScreen: React.FC<Props> = ({ onClose }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const winRate = user.gamesPlayed > 0
    ? Math.round((user.gamesWon / user.gamesPlayed) * 100)
    : 0;

  return (
    <div className="profile-overlay" onClick={onClose}>
      <div className="profile-card" onClick={e => e.stopPropagation()}>
        <button className="profile-close" onClick={onClose}>✕</button>

        <div className="profile-header">
          <div className="profile-crown">👑</div>
          <h2 className="profile-nickname">{user.nickname}</h2>
          <p className="profile-since">Nel regno dal {new Date(user.createdAt).toLocaleDateString('it-IT')}</p>
        </div>

        <div className="profile-stats">
          <div className="stat-block">
            <span className="stat-value">{user.gamesPlayed}</span>
            <span className="stat-label">Partite</span>
          </div>
          <div className="stat-block highlight">
            <span className="stat-value">{user.gamesWon}</span>
            <span className="stat-label">Vittorie</span>
          </div>
          <div className="stat-block">
            <span className="stat-value">{winRate}%</span>
            <span className="stat-label">Win Rate</span>
          </div>
          <div className="stat-block">
            <span className="stat-value">{user.totalScore}</span>
            <span className="stat-label">Score</span>
          </div>
        </div>

        <button className="profile-logout" onClick={() => { logout(); onClose(); }}>
          Esci dal Regno
        </button>
      </div>
    </div>
  );
};
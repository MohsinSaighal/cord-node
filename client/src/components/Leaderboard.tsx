import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, TrendingUp, Users, Award, Search, Loader } from 'lucide-react';
import { UserData } from '../types';
import { useSupabaseLeaderboard } from '../hooks/useSupabaseLeaderboard';
import { supabase } from '../lib/supabase';

interface LeaderboardProps {
  currentUser?: UserData;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentUser }) => {
  const { leaderboard, selectedPeriod, setSelectedPeriod, loading } = useSupabaseLeaderboard(currentUser);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalMiners, setTotalMiners] = useState(0);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState(leaderboard);
  const [currentUserPosition, setCurrentUserPosition] = useState<number | null>(null);
  const [activeMiners,setActiveMiners] = useState<number>(0);
  console.log("leaderboard",leaderboard)
  // Fetch total miners count
  useEffect(() => {
    const fetchTotalMiners = async () => {
      try {
        const { data, error } = await supabase.rpc('get_current_leaderboard_stats');
        if (error) {
          console.error('Error fetching leaderboard stats:', error);
          return;
        }
        
        if (data && data.totalMiners) {
          setActiveMiners(data.activeMiners)
          setTotalMiners(data.totalMiners);
        }
      } catch (error) {
        console.error('Error in fetchTotalMiners:', error);
      }
    };
    
    fetchTotalMiners();
  }, []);

  useEffect(() => {
    let filtered = leaderboard;
    
    if (searchTerm) {
      filtered = leaderboard.filter(entry => 
        entry.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredLeaderboard(filtered);
    
    // Find current user position
    if (currentUser) {
      const position = leaderboard.findIndex(entry => entry.username === currentUser.username);
      setCurrentUserPosition(position >= 0 ? position + 1 : null);
    }
  }, [leaderboard, searchTerm, currentUser]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 sm:w-6 sm:h-6 text-yellow-400" />;
      case 2: return <Medal className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 sm:w-6 sm:h-6 text-amber-600" />;
      default: return <span className="text-gray-400 font-bold text-sm sm:text-base">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 2: return 'bg-gradient-to-r from-gray-400 to-gray-600';
      case 3: return 'bg-gradient-to-r from-amber-500 to-amber-700';
      default: return 'bg-gray-800';
    }
  };

  const periods = [
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'all-time', label: 'All Time' }
  ];

  const topEarner = leaderboard.length > 0 ? leaderboard[0].totalEarned : 0;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-gray-400">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Leaderboard</h1>
        <p className="text-gray-400 text-sm sm:text-base">
          See how you rank against other CordNode miners
        </p>
      </div>

      {/* Current User Position */}
      {currentUser && currentUserPosition && (
        <div className="bg-gradient-to-r from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden flex-shrink-0">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.username} 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold text-sm sm:text-base">Your Position</h3>
                <p className="text-gray-300 text-xs sm:text-sm truncate">{currentUser.username}</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-xl sm:text-2xl font-bold text-cyan-400">#{currentUserPosition}</div>
              <div className="text-gray-300 text-xs sm:text-sm">{Math.floor(currentUser.totalEarned).toLocaleString()} CORD</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600">
              <Trophy className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white" title="Total registered miners">
              {totalMiners || leaderboard.length}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Total Miners</h3>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-green-400 to-green-600">
              <Users className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">
              {activeMiners}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Active Miners</h3>
        </div>
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 sm:p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-600">
              <TrendingUp className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-bold text-white">
              {Math.floor(topEarner).toLocaleString()}
            </span>
          </div>
          <h3 className="text-gray-400 text-xs sm:text-sm font-medium">Top Earner (CORD)</h3>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col space-y-4 mb-6 sm:mb-8">
        {/* Period Filter */}
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {periods.map(period => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id as any)}
              className={`px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap text-xs sm:text-sm ${
                selectedPeriod === period.id
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 sm:py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm sm:text-base"
          />
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Account Age
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {selectedPeriod === 'all-time' ? 'Total Earned' : 
                   selectedPeriod === 'weekly' ? 'Weekly Earned' : 
                   selectedPeriod === 'monthly' ? 'Monthly Earned' : 'Daily Earned'} (CORD)
                </th>
                <th className="hidden sm:table-cell px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLeaderboard.map((entry, index) => {
                const isCurrentUser = currentUser && entry.username === currentUser.username;
                return (
                  <tr 
                    key={`${entry.username}-${index}`} 
                    className={`transition-colors ${
                      isCurrentUser 
                        ? 'bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border-l-4 border-cyan-500' 
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${getRankBadge(entry.rank)}`}>
                        {entry.rank <= 3 ? (
                          getRankIcon(entry.rank)
                        ) : (
                          <span className="text-white font-bold text-xs sm:text-sm">#{entry.rank}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden flex-shrink-0">
                          <img 
                            src={entry.avatar} 
                            alt={entry.username} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`text-xs sm:text-sm font-medium truncate ${isCurrentUser ? 'text-cyan-400' : 'text-white'}`}>
                            {entry.username} {isCurrentUser && '(You)'}
                          </div>
                          <div className="sm:hidden text-xs text-gray-400">{entry.accountAge}y</div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{entry.accountAge} years</div>
                    </td>
                    <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium text-white">
                        {Math.floor(entry.totalEarned).toLocaleString()}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${entry.isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                        <span className={`text-sm ${entry.isActive ? 'text-green-400' : 'text-gray-400'}`}>
                          {entry.isActive ? 'Mining' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredLeaderboard.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-400">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
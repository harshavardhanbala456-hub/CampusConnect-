import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Filter, Calendar, Tag, Building2, FileText, MessageSquare, Send } from 'lucide-react';
import { format } from 'date-fns';
import api from '../api';
import { Announcement, Comment } from './AdminPanel';

export default function Dashboard() {
  const { userProfile, currentUser } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterDept, setFilterDept] = useState(userProfile?.role === 'student' ? userProfile.department : 'All');
  const [filterYear, setFilterYear] = useState(userProfile?.role === 'student' ? userProfile.year : 'All');
  const [filterCategory, setFilterCategory] = useState('All');

  // Comments state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const loadAnnouncements = async () => {
    try {
      const { data } = await api.get('/api/announcements');
      setAnnouncements(data.announcements);
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    window.addEventListener('announcementsUpdated', loadAnnouncements);
    return () => {
      window.removeEventListener('announcementsUpdated', loadAnnouncements);
    };
  }, []);

  const handleAddComment = async (announcementId: string) => {
    const text = commentInputs[announcementId]?.trim();
    if (!text || !currentUser || !userProfile) return;

    try {
      await api.post(`/api/announcements/${announcementId}/comments`, { text });
      
      // Optionally reload all announcements to get the updated comments list,
      // or we could optimistically update the state. Re-fetching is simplest:
      loadAnnouncements();
      
      setCommentInputs(prev => ({ ...prev, [announcementId]: '' }));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to post comment');
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchDept = filterDept === 'All' || a.department === 'All' || a.department === filterDept;
    const matchYear = filterYear === 'All' || a.year === 'All' || a.year === filterYear;
    const matchCategory = filterCategory === 'All' || a.category === filterCategory;
    return matchDept && matchYear && matchCategory;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-md shadow-sm border border-gray-100">
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Department</label>
          <select 
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
          >
            <option value="All">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
            <option value="CIVIL">CIVIL</option>
            <option value="EEE">EEE</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
          <select 
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            <option value="All">All Years</option>
            <option value="1st">1st Year</option>
            <option value="2nd">2nd Year</option>
            <option value="3rd">3rd Year</option>
            <option value="4th">4th Year</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
          <select 
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Academic">Academic</option>
            <option value="Non-Academic">Non-Academic</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-6">
        {filteredAnnouncements.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
            <p className="text-gray-500">No announcements found matching your filters.</p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <div key={announcement.id} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{announcement.title}</h2>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                    ${announcement.category === 'Academic' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                    {announcement.category}
                  </span>
                </div>
                
                <p className="text-gray-600 whitespace-pre-wrap mb-6">{announcement.description}</p>
                
                {announcement.pdfData && (
                  <a 
                    href={announcement.pdfData} 
                    download={announcement.pdfName || 'announcement.pdf'}
                    className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-6 bg-indigo-50 px-3 py-2 rounded-md border border-indigo-100"
                  >
                    <FileText className="h-4 w-4" />
                    Download PDF ({announcement.pdfName || 'Document'})
                  </a>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-500 border-t border-gray-100 pt-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(announcement.createdAt || announcement.created_at || new Date()), 'MMM d, yyyy h:mm a')}
                  </div>
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    Dept: {announcement.department}
                  </div>
                  <div className="flex items-center gap-1">
                    <Tag className="h-4 w-4" />
                    Year: {announcement.year}
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="font-medium">By {announcement.authorName}</span>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="bg-gray-50 p-6 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  Comments ({(announcement.comments || []).length})
                </h3>
                
                <div className="space-y-4 mb-4">
                  {(announcement.comments || []).map(comment => (
                    <div key={comment.id} className="bg-white p-3 rounded-md shadow-sm border border-gray-100">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-gray-900">{comment.authorName}</span>
                        <span className="text-xs text-gray-500">{format(new Date(comment.createdAt || comment.created_at || new Date()), 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-gray-700">{comment.text}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={commentInputs[announcement.id] || ''}
                    onChange={(e) => setCommentInputs(prev => ({ ...prev, [announcement.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment(announcement.id);
                    }}
                  />
                  <button
                    onClick={() => handleAddComment(announcement.id)}
                    disabled={!commentInputs[announcement.id]?.trim()}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

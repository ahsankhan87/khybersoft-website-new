import { useState, useEffect } from 'react';
import {
  LayoutDashboard, FileText, Newspaper, Tag, MessageSquare, Image,
  Package, FolderOpen, CreditCard, Play, Mail, BookOpen, GitBranch,
  Wrench, FileQuestion, Users, Briefcase, Code, Star, UserCheck,
  Building2, HelpCircle, Inbox, Send, Search, Shield, Settings,
  ScrollText, Database, Sun, Moon, Bell, ChevronDown, ChevronRight,
  Menu, X, ExternalLink, LogOut, Eye, EyeOff, ArrowUpRight,
  CheckCircle2, AlertCircle, Clock, TrendingUp, Activity, Server,
  HardDrive, Cpu,
} from 'lucide-react';

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  url?: string;
  badge?: number;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    title: '',
    items: [
      { label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Pages', icon: <FileText size={18} /> },
      { label: 'Blog Posts', icon: <Newspaper size={18} /> },
      { label: 'Categories', icon: <Tag size={18} /> },
      { label: 'Comments', icon: <MessageSquare size={18} />, badge: 3 },
      { label: 'Media Library', icon: <Image size={18} /> },
    ],
  },
  {
    title: 'Products',
    items: [
      { label: 'Categories', icon: <FolderOpen size={18} /> },
      { label: 'Products', icon: <Package size={18} /> },
      { label: 'Plans', icon: <CreditCard size={18} /> },
      { label: 'Demos', icon: <Play size={18} /> },
      { label: 'Inquiries', icon: <Mail size={18} />, badge: 5 },
      { label: 'Tutorials', icon: <BookOpen size={18} /> },
      { label: 'Versions', icon: <GitBranch size={18} /> },
    ],
  },
  {
    title: 'Services',
    items: [
      { label: 'Services', icon: <Wrench size={18} /> },
      { label: 'Inquiries', icon: <Mail size={18} /> },
      { label: 'Custom Requests', icon: <Code size={18} /> },
    ],
  },
  {
    title: 'Business',
    items: [
      { label: 'Testimonials', icon: <Star size={18} /> },
      { label: 'Team', icon: <UserCheck size={18} /> },
      { label: 'Clients/Portfolio', icon: <Building2 size={18} /> },
      { label: 'FAQs', icon: <HelpCircle size={18} /> },
      { label: 'Messages', icon: <Inbox size={18} />, badge: 2 },
      { label: 'Newsletter', icon: <Send size={18} /> },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { label: 'SEO Manager', icon: <Search size={18} /> },
      { label: 'Redirects', icon: <ArrowUpRight size={18} /> },
      { label: 'Sitemap', icon: <ScrollText size={18} /> },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Users', icon: <Users size={18} /> },
      { label: 'Roles & Permissions', icon: <Shield size={18} /> },
      { label: 'Settings', icon: <Settings size={18} /> },
      { label: 'Activity Logs', icon: <Activity size={18} /> },
      { label: 'Backup', icon: <Database size={18} /> },
    ],
  },
];

const recentInquiries = [
  { id: 1, name: 'Ahmed Khan', email: 'ahmed@techcorp.pk', product: 'ERP Suite', type: 'demo', status: 'new', time: '2 min ago' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@startup.io', product: 'CRM Pro', type: 'quote', status: 'in_progress', time: '15 min ago' },
  { id: 3, name: 'Muhammad Ali', email: 'ali@business.com', product: 'Inventory Manager', type: 'support', status: 'new', time: '1 hour ago' },
  { id: 4, name: 'Fatima Zahra', email: 'fatima@edu.org', product: 'LMS Platform', type: 'demo', status: 'resolved', time: '3 hours ago' },
  { id: 5, name: 'John Smith', email: 'john@enterprise.co', product: 'HR Management', type: 'quote', status: 'new', time: '5 hours ago' },
];

const topProducts = [
  { name: 'ERP Suite Pro', count: 47 },
  { name: 'CRM Platform', count: 35 },
  { name: 'Inventory Manager', count: 28 },
  { name: 'HR Management', count: 21 },
  { name: 'LMS Platform', count: 15 },
];

const activityFeed = [
  { user: 'Admin', action: 'Updated product "ERP Suite Pro"', time: '2 min ago' },
  { user: 'Editor', action: 'Published blog post "Getting Started"', time: '15 min ago' },
  { user: 'System', action: 'Backup completed successfully', time: '1 hour ago' },
  { user: 'Admin', action: 'Approved 3 comments', time: '2 hours ago' },
  { user: 'Admin', action: 'Updated site settings', time: '3 hours ago' },
  { user: 'Editor', action: 'Added new testimonial', time: '5 hours ago' },
];

const systemHealth = [
  { label: 'PHP Version', value: '8.2.12', status: 'good' },
  { label: 'MySQL Version', value: '8.0.35', status: 'good' },
  { label: 'Database Size', value: '24.5 MB', status: 'good' },
  { label: 'Disk Space Free', value: '4.2 GB / 10 GB', status: 'good' },
  { label: 'Memory Usage', value: '32 MB', status: 'good' },
  { label: 'Upload Max', value: '20M', status: 'good' },
  { label: 'SSL Enabled', value: 'Yes', status: 'good' },
  { label: 'Query Count', value: '12', status: 'info' },
];

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('admin@khybersoft.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-slate-400 mt-1">Sign in to Khybersoft Admin</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/70 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-8 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@khybersoft.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <button type="button" className="text-xs text-blue-400 hover:text-blue-300">Forgot password?</button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-slate-800/80 border border-slate-600/50 rounded-xl text-white placeholder-slate-500 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center mb-6">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500" defaultChecked />
              <label htmlFor="remember" className="ml-2.5 text-sm text-slate-400">Remember me for 30 days</label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badges */}
        <div className="flex items-center justify-center gap-4 mt-6 text-xs text-slate-500">
          <span className="flex items-center gap-1"><Shield size={12} /> CSRF Protected</span>
          <span className="flex items-center gap-1"><Clock size={12} /> Rate Limited</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={12} /> 2FA Ready</span>
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [activeItem, setActiveItem] = useState('Dashboard');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    Object.fromEntries(menuGroups.map(g => [g.title, true]))
  );
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [inquiries, setInquiries] = useState(recentInquiries);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const updateInquiryStatus = (id: number, status: string) => {
    setInquiries(prev => prev.map(inq => inq.id === id ? { ...inq, status } : inq));
  };

  const bg = darkMode ? 'bg-slate-900' : 'bg-gray-50';
  const cardBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const borderColor = darkMode ? 'border-slate-700' : 'border-gray-200';
  const textPrimary = darkMode ? 'text-white' : 'text-gray-900';
  const textSecondary = darkMode ? 'text-slate-400' : 'text-gray-500';
  const textMuted = darkMode ? 'text-slate-500' : 'text-gray-400';
  const sidebarBg = darkMode ? 'bg-slate-800' : 'bg-white';
  const hoverBg = darkMode ? 'hover:bg-slate-700/50' : 'hover:bg-gray-100';

  return (
    <div className={`min-h-screen ${bg} ${darkMode ? 'dark' : ''} font-sans`}>
      {/* Mobile overlay */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileSidebar(false)} />
      )}

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 ${sidebarBg} border-r ${borderColor} transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto flex flex-col ${
            mobileSidebar ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Sidebar Header */}
          <div className={`flex items-center justify-between h-16 px-4 border-b ${borderColor} flex-shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              {sidebarOpen && <span className={`font-bold ${textPrimary} text-lg`}>Admin</span>}
            </div>
            <button onClick={() => setMobileSidebar(false)} className="lg:hidden p-1 text-slate-400">
              <X size={18} />
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {menuGroups.map((group) => (
              <div key={group.title || 'main'}>
                {group.title && (
                  <div className="pt-4 pb-1">
                    <button
                      onClick={() => toggleGroup(group.title)}
                      className={`flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${textMuted}`}
                    >
                      <span>{group.title}</span>
                      {expandedGroups[group.title] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    {expandedGroups[group.title] && (
                      <div className="mt-1 space-y-0.5">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => { setActiveItem(item.label); setMobileSidebar(false); }}
                            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                              activeItem === item.label
                                ? 'bg-blue-500/15 text-blue-400 font-medium border-r-3 border-blue-500'
                                : `${textSecondary} ${hoverBg}`
                            }`}
                          >
                            {item.icon}
                            {sidebarOpen && (
                              <>
                                <span className="flex-1 text-left">{item.label}</span>
                                {item.badge && (
                                  <span className="px-1.5 py-0.5 text-xs bg-red-500/20 text-red-400 rounded-full">{item.badge}</span>
                                )}
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!group.title && group.items.map((item) => (
                  <button
                    key={item.label}
                    onClick={() => { setActiveItem(item.label); setMobileSidebar(false); }}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeItem === item.label
                        ? 'bg-blue-500/15 text-blue-400 font-medium'
                        : `${textSecondary} ${hoverBg}`
                    }`}
                  >
                    {item.icon}
                    {sidebarOpen && <span>{item.label}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className={`p-3 border-t ${borderColor} flex-shrink-0`}>
            <button className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${textSecondary} ${hoverBg} transition-colors w-full`}>
              <ExternalLink size={18} />
              {sidebarOpen && <span>View Site</span>}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Navbar */}
          <header className={`sticky top-0 z-30 h-16 ${cardBg} border-b ${borderColor} flex items-center justify-between px-4 lg:px-6 flex-shrink-0`}>
            <div className="flex items-center gap-4">
              <button onClick={() => setMobileSidebar(true)} className="lg:hidden p-2 text-slate-400 rounded-lg hover:bg-slate-700/50">
                <Menu size={20} />
              </button>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="hidden lg:block p-2 text-slate-400 rounded-lg hover:bg-slate-700/50">
                <Menu size={20} />
              </button>

              {/* Breadcrumbs */}
              <nav className="hidden sm:flex items-center gap-1.5 text-sm">
                <button className={textMuted}>
                  <LayoutDashboard size={16} />
                </button>
                <ChevronRight size={14} className={textMuted} />
                <span className={`font-medium ${textPrimary}`}>{activeItem}</span>
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                  <input
                    type="text"
                    placeholder="Search..."
                    className={`pl-9 pr-4 py-2 w-56 ${darkMode ? 'bg-slate-700 text-white placeholder-slate-500' : 'bg-gray-100 text-gray-900 placeholder-gray-400'} border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all`}
                  />
                </div>
              </div>

              {/* Dark Mode Toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg ${textSecondary} ${hoverBg} transition-colors`}
              >
                {darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`relative p-2 rounded-lg ${textSecondary} ${hoverBg} transition-colors`}
                >
                  <Bell size={18} />
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-800"></span>
                </button>

                {showNotifications && (
                  <div className={`absolute right-0 mt-2 w-80 ${cardBg} rounded-xl shadow-lg border ${borderColor} overflow-hidden z-50`}>
                    <div className={`p-3 border-b ${borderColor}`}>
                      <h3 className={`text-sm font-semibold ${textPrimary}`}>Notifications</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {recentInquiries.slice(0, 4).map((inq) => (
                        <div key={inq.id} className={`flex items-start gap-3 p-3 ${hoverBg} border-b ${borderColor}`}>
                          <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'} flex items-center justify-center flex-shrink-0`}>
                            <Mail size={14} className="text-blue-400" />
                          </div>
                          <div>
                            <p className={`text-sm ${textSecondary}`}>New inquiry from {inq.name}</p>
                            <p className={`text-xs ${textMuted} mt-0.5`}>{inq.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg ${hoverBg} transition-colors`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-sm font-medium">A</span>
                  </div>
                  <span className={`hidden sm:block text-sm font-medium ${textSecondary}`}>Admin</span>
                  <ChevronDown size={14} className={`hidden sm:block ${textMuted}`} />
                </button>

                {showUserMenu && (
                  <div className={`absolute right-0 mt-2 w-48 ${cardBg} rounded-xl shadow-lg border ${borderColor} overflow-hidden z-50`}>
                    <div className={`p-3 border-b ${borderColor}`}>
                      <p className={`text-sm font-medium ${textPrimary}`}>Admin User</p>
                      <p className={`text-xs ${textMuted}`}>admin@khybersoft.com</p>
                    </div>
                    <div className="py-1">
                      <button className={`flex items-center gap-2 w-full px-3 py-2 text-sm ${textSecondary} ${hoverBg}`}>
                        <Settings size={14} /> Settings
                      </button>
                      <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <LogOut size={14} /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {/* Page Header */}
            <div className="mb-6">
              <h1 className={`text-2xl font-bold ${textPrimary}`}>Dashboard</h1>
              <p className={`text-sm ${textSecondary} mt-1`}>Welcome back, Admin. Here's what's happening.</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Products', value: '24', change: '+12%', color: 'blue' },
                { label: 'Inquiries Today', value: '7', change: '+5%', color: 'green' },
                { label: 'Blog Posts', value: '48', change: '+3', color: 'purple' },
                { label: 'Subscribers', value: '1,247', change: '+8%', color: 'amber' },
              ].map((stat) => {
                const colorClasses: Record<string, { icon: string; text: string; bar: string }> = {
                  blue: { icon: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-500', bar: 'from-blue-500 to-blue-400' },
                  green: { icon: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-500', bar: 'from-green-500 to-green-400' },
                  purple: { icon: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-500', bar: 'from-purple-500 to-purple-400' },
                  amber: { icon: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-500', bar: 'from-amber-500 to-amber-400' },
                };
                const c = colorClasses[stat.color];
                return (
                  <div key={stat.label} className={`${cardBg} rounded-xl border ${borderColor} p-5 hover:shadow-md transition-shadow`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className={`text-sm font-medium ${textSecondary}`}>{stat.label}</p>
                        <p className={`text-3xl font-bold ${textPrimary} mt-1`}>{stat.value}</p>
                        <p className={`text-xs ${c.text} mt-1 font-medium flex items-center gap-1`}>
                          <TrendingUp size={12} /> {stat.change} from last week
                        </p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg ${c.icon} flex items-center justify-center`}>
                        <TrendingUp size={18} className={c.text} />
                      </div>
                    </div>
                    {/* Sparkline */}
                    <div className="mt-3 h-8">
                      <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                        <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          className={c.text}
                          points="0,25 15,20 30,22 45,15 60,18 75,10 90,12 100,8" />
                        <polyline fill="currentColor" fillOpacity="0.1" stroke="none"
                          className={c.text}
                          points="0,30 0,25 15,20 30,22 45,15 60,18 75,10 90,12 100,8 100,30" />
                      </svg>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Recent Inquiries */}
              <div className={`lg:col-span-2 ${cardBg} rounded-xl border ${borderColor}`}>
                <div className={`p-5 border-b ${borderColor} flex items-center justify-between`}>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Recent Inquiries</h2>
                  <button className="text-sm text-blue-500 hover:underline">View all</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={`border-b ${borderColor}`}>
                        <th className={`text-left py-3 px-5 font-medium ${textSecondary}`}>Name</th>
                        <th className={`text-left py-3 px-5 font-medium ${textSecondary}`}>Product</th>
                        <th className={`text-left py-3 px-5 font-medium ${textSecondary}`}>Status</th>
                        <th className={`text-left py-3 px-5 font-medium ${textSecondary}`}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inquiries.map((inq) => (
                        <tr key={inq.id} className={`border-b ${darkMode ? 'border-slate-700/50' : 'border-gray-50'} ${hoverBg}`}>
                          <td className="py-3 px-5">
                            <div className={`font-medium ${textPrimary}`}>{inq.name}</div>
                            <div className={`text-xs ${textMuted}`}>{inq.email}</div>
                          </td>
                          <td className={`py-3 px-5 ${textSecondary}`}>{inq.product}</td>
                          <td className="py-3 px-5">
                            <select
                              value={inq.status}
                              onChange={(e) => updateInquiryStatus(inq.id, e.target.value)}
                              className={`text-xs rounded-lg border ${borderColor} ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-white text-gray-700'} px-2 py-1`}
                            >
                              <option value="new">New</option>
                              <option value="in_progress">In Progress</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                          <td className={`py-3 px-5 ${textMuted} text-xs`}>{inq.time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Products */}
              <div className={`${cardBg} rounded-xl border ${borderColor}`}>
                <div className={`p-5 border-b ${borderColor}`}>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Top Products</h2>
                  <p className={`text-xs ${textMuted} mt-0.5`}>By inquiry count</p>
                </div>
                <div className="p-5 space-y-4">
                  {topProducts.map((product) => (
                    <div key={product.name}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-medium ${textSecondary} truncate`}>{product.name}</span>
                        <span className={`text-sm font-bold ${textPrimary}`}>{product.count}</span>
                      </div>
                      <div className={`w-full h-2 ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} rounded-full overflow-hidden`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
                          style={{ width: `${(product.count / topProducts[0].count) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Activity Feed */}
              <div className={`${cardBg} rounded-xl border ${borderColor}`}>
                <div className={`p-5 border-b ${borderColor} flex items-center justify-between`}>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>Recent Activity</h2>
                  <button className="text-sm text-blue-500 hover:underline">View all</button>
                </div>
                <div className="p-5 space-y-4 max-h-80 overflow-y-auto">
                  {activityFeed.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-slate-700' : 'bg-gray-100'} flex items-center justify-center flex-shrink-0`}>
                        <Clock size={14} className={textMuted} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${textSecondary}`}>
                          <span className="font-medium">{item.user}</span> {item.action}
                        </p>
                        <p className={`text-xs ${textMuted} mt-0.5`}>{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Health */}
              <div className={`${cardBg} rounded-xl border ${borderColor}`}>
                <div className={`p-5 border-b ${borderColor}`}>
                  <h2 className={`text-lg font-semibold ${textPrimary}`}>System Health</h2>
                </div>
                <div className="p-5 space-y-3">
                  {systemHealth.map((item) => (
                    <div key={item.label} className={`flex items-center justify-between py-2 border-b ${darkMode ? 'border-slate-700/50' : 'border-gray-100'} last:border-0`}>
                      <span className={`text-sm ${textSecondary}`}>{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${textPrimary}`}>{item.value}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          item.status === 'good' ? 'bg-green-400' : item.status === 'warn' ? 'bg-amber-400' : 'bg-blue-400'
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Traffic Chart */}
            <div className={`${cardBg} rounded-xl border ${borderColor} p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-lg font-semibold ${textPrimary}`}>Traffic Overview</h2>
                <span className={`text-xs ${textMuted}`}>Last 30 days</span>
              </div>
              <div className="h-48 flex items-end justify-between gap-1 px-4">
                {Array.from({ length: 30 }, (_, i) => {
                  const height = Math.random() * 80 + 20;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm relative overflow-hidden ${darkMode ? 'bg-blue-500/20' : 'bg-blue-100'}`}
                        style={{ height: `${height}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 opacity-80 rounded-t-sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function AdminPanelPreview() {
  const [view, setView] = useState<'login' | 'dashboard'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      setView('dashboard');
    }
  }, [isLoggedIn]);

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Admin Panel Preview</h2>
          <p className="text-slate-400 mt-1">Interactive preview of the admin panel UI</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setView('login'); setIsLoggedIn(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'login' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Login Page
          </button>
          <button
            onClick={() => { setView('dashboard'); setIsLoggedIn(true); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              view === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Preview Container */}
      <div className="rounded-xl border border-slate-700 overflow-hidden shadow-2xl">
        <div className="bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-slate-500 font-mono">
              {view === 'login' ? 'khybersoft.com/admin/login' : 'khybersoft.com/admin'}
            </span>
          </div>
        </div>
        <div className="h-[700px] overflow-auto">
          {view === 'login' ? (
            <LoginPage onLogin={() => setIsLoggedIn(true)} />
          ) : (
            <AdminDashboard />
          )}
        </div>
      </div>

      {/* Features List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { icon: Shield, title: 'Auth System', desc: 'Login, logout, forgot/reset password, 2FA (TOTP), session management' },
          { icon: LayoutDashboard, title: 'Admin Layout', desc: 'Collapsible sidebar, top navbar, breadcrumbs, responsive mobile drawer' },
          { icon: Sun, title: 'Dark/Light Mode', desc: 'Toggle with localStorage persistence, applied globally via Tailwind dark class' },
          { icon: Bell, title: 'Notifications', desc: 'Dropdown with real-time notifications, toast system for success/error messages' },
          { icon: TrendingUp, title: 'Dashboard Widgets', desc: 'Stats cards with sparklines, charts, activity feed, system health monitor' },
          { icon: Server, title: 'Rate Limiting', desc: '5 attempts per 15 minutes for login, account lockout after failures' },
        ].map((feature, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
            <feature.icon size={20} className="text-blue-400 mb-2" />
            <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
            <p className="text-xs text-slate-400 mt-1">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

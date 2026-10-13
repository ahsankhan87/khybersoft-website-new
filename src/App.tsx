import { useState, useMemo } from 'react';
import { phpFiles } from './data/phpFiles';
import { adminPhpFiles } from './data/adminFiles';
import { databaseSchema } from './data/schema';
import { crudBaseFiles } from './data/crudBase';
import { crudContentFiles } from './data/crudContent';
import { crudProductsFiles } from './data/crudProducts';
import { crudBusinessFiles } from './data/crudBusiness';
import { crudSystemFiles } from './data/crudSystem';
import { frontLayoutFiles, frontControllerFiles } from './data/frontLayout';
import { frontViewFiles } from './data/frontViews';
import { frontProductViews } from './data/frontProductViews';
import { frontBlogViews } from './data/frontBlogViews';
import { frontAdditionalViews } from './data/frontAdditionalViews';
import { AdminPanelPreview } from './components/AdminPreview';
import {
  FolderTree,
  Database,
  FileCode,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
  Layout,
  Shield,
  Server,
  Menu,
  X,
  Download,
  ExternalLink,
  Lock,
  LayoutDashboard,
} from 'lucide-react';

type Tab = 'structure' | 'database' | 'code' | 'admin' | 'crud' | 'frontend';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: TreeNode[];
  description?: string;
}

function buildFileTree(): TreeNode[] {
  return [
    {
      name: 'public_html/',
      path: 'public_html',
      type: 'folder',
      children: [
        { name: 'index.php', path: 'public_html/index.php', type: 'file', description: 'Front Controller' },
        { name: '.htaccess', path: 'public_html/.htaccess', type: 'file', description: 'URL Rewriting & Security' },
        {
          name: 'assets/',
          path: 'public_html/assets',
          type: 'folder',
          children: [
            { name: 'css/', path: 'public_html/assets/css', type: 'folder', children: [] },
            { name: 'js/', path: 'public_html/assets/js', type: 'folder', children: [] },
            { name: 'images/', path: 'public_html/assets/images', type: 'folder', children: [] },
          ],
        },
        { name: 'uploads/', path: 'public_html/uploads', type: 'folder', children: [] },
      ],
    },
    {
      name: 'app/',
      path: 'app',
      type: 'folder',
      children: [
        {
          name: 'config/',
          path: 'app/config',
          type: 'folder',
          children: [
            { name: 'config.php', path: 'app/config/config.php', type: 'file', description: 'App Configuration' },
            { name: 'database.php', path: 'app/config/database.php', type: 'file', description: 'DB Configuration' },
          ],
        },
        {
          name: 'core/',
          path: 'app/core',
          type: 'folder',
          children: [
            { name: 'Database.php', path: 'app/core/Database.php', type: 'file', description: 'PDO Singleton' },
            { name: 'Router.php', path: 'app/core/Router.php', type: 'file', description: 'URL Router' },
            { name: 'Controller.php', path: 'app/core/Controller.php', type: 'file', description: 'Base Controller' },
            { name: 'Model.php', path: 'app/core/Model.php', type: 'file', description: 'Base Model' },
            { name: 'Auth.php', path: 'app/core/Auth.php', type: 'file', description: 'Authentication' },
            { name: 'Validator.php', path: 'app/core/Validator.php', type: 'file', description: 'Input Validation' },
            { name: 'CSRF.php', path: 'app/core/CSRF.php', type: 'file', description: 'CSRF Protection' },
            { name: 'RateLimiter.php', path: 'app/core/RateLimiter.php', type: 'file', description: 'Rate Limiting' },
            { name: 'TOTP.php', path: 'app/core/TOTP.php', type: 'file', description: '2FA TOTP' },
          ],
        },
        {
          name: 'controllers/',
          path: 'app/controllers',
          type: 'folder',
          children: [
            {
              name: 'admin/',
              path: 'app/controllers/admin',
              type: 'folder',
              children: [
                { name: 'DashboardController.php', path: 'app/controllers/admin/DashboardController.php', type: 'file' },
                { name: 'AuthController.php', path: 'app/controllers/admin/AuthController.php', type: 'file' },
              ],
            },
            {
              name: 'front/',
              path: 'app/controllers/front',
              type: 'folder',
              children: [
                { name: 'HomeController.php', path: 'app/controllers/front/HomeController.php', type: 'file' },
                { name: 'ProductController.php', path: 'app/controllers/front/ProductController.php', type: 'file' },
                { name: 'BlogController.php', path: 'app/controllers/front/BlogController.php', type: 'file' },
              ],
            },
          ],
        },
        {
          name: 'models/',
          path: 'app/models',
          type: 'folder',
          children: [
            { name: 'Product.php', path: 'app/models/Product.php', type: 'file' },
            { name: 'BlogPost.php', path: 'app/models/BlogPost.php', type: 'file' },
            { name: 'Testimonial.php', path: 'app/models/Testimonial.php', type: 'file' },
            { name: 'Service.php', path: 'app/models/Service.php', type: 'file' },
            { name: 'Client.php', path: 'app/models/Client.php', type: 'file' },
          ],
        },
        {
          name: 'views/',
          path: 'app/views',
          type: 'folder',
          children: [
            { name: 'layouts/', path: 'app/views/layouts', type: 'folder', children: [
              { name: 'admin.main.php', path: 'app/views/layouts/admin.main.php', type: 'file' },
            ] },
            { name: 'admin/', path: 'app/views/admin', type: 'folder', children: [
              { name: 'auth/', path: 'app/views/admin/auth', type: 'folder', children: [
                { name: 'login.php', path: 'app/views/admin/auth/login.php', type: 'file' },
              ] },
              { name: 'dashboard.php', path: 'app/views/admin/dashboard.php', type: 'file' },
            ] },
            { name: 'front/', path: 'app/views/front', type: 'folder', children: [] },
          ],
        },
        {
          name: 'helpers/',
          path: 'app/helpers',
          type: 'folder',
          children: [
            { name: 'functions.php', path: 'app/helpers/functions.php', type: 'file' },
          ],
        },
        {
          name: 'middleware/',
          path: 'app/middleware',
          type: 'folder',
          children: [
            { name: 'AuthMiddleware.php', path: 'app/middleware/AuthMiddleware.php', type: 'file' },
            { name: 'AdminMiddleware.php', path: 'app/middleware/AdminMiddleware.php', type: 'file' },
            { name: 'AdminAuth.php', path: 'app/middleware/AdminAuth.php', type: 'file' },
            { name: 'Permission.php', path: 'app/middleware/Permission.php', type: 'file' },
            { name: 'PermissionMiddleware.php', path: 'app/middleware/PermissionMiddleware.php', type: 'file' },
            { name: 'GuestMiddleware.php', path: 'app/middleware/GuestMiddleware.php', type: 'file' },
          ],
        },
      ],
    },
    {
      name: 'routes/',
      path: 'routes',
      type: 'folder',
      children: [
        { name: 'web.php', path: 'routes/web.php', type: 'file', description: 'Route Definitions' },
        { name: 'admin.php', path: 'routes/admin.php', type: 'file', description: 'Admin Routes' },
      ],
    },
    {
      name: 'storage/',
      path: 'storage',
      type: 'folder',
      children: [
        { name: 'logs/', path: 'storage/logs', type: 'folder', children: [] },
        { name: 'cache/', path: 'storage/cache', type: 'folder', children: [] },
      ],
    },
    {
      name: 'database/',
      path: 'database',
      type: 'folder',
      children: [
        { name: 'migrations/', path: 'database/migrations', type: 'folder', children: [
          { name: 'password_resets.sql', path: 'database/migrations/password_resets.sql', type: 'file' },
        ] },
      ],
    },
    { name: '.env.example', path: '.env.example', type: 'file', description: 'Environment Template' },
  ];
}

function FileTreeItem({ node, depth = 0, onSelect, selectedPath }: {
  node: TreeNode;
  depth?: number;
  onSelect: (path: string) => void;
  selectedPath: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isActive = node.path === selectedPath;

  if (node.type === 'folder') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 w-full px-2 py-1 text-left text-sm text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span className="text-yellow-400">📁</span>
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <FileTreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                onSelect={onSelect}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full px-2 py-1 text-left text-sm rounded transition-colors ${
        isActive ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-400' : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
      }`}
      style={{ paddingLeft: `${depth * 16 + 24}px` }}
    >
      <span className="text-blue-400">📄</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function CodeBlock({ code, filename, language }: { code: string; filename: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-slate-400" />
          <span className="text-sm text-slate-300 font-mono">{filename}</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
        >
          {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto">
        <code className="text-slate-300">{code}</code>
      </pre>
    </div>
  );
}

function DatabaseSchemaView() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(databaseSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tables = useMemo(() => {
    const matches = databaseSchema.match(/CREATE TABLE.*?`(\w+)`/g) || [];
    return matches.map(m => m.match(/`(\w+)`/)?.[1] || '').filter(Boolean);
  }, []);

  const tableGroups = {
    'Core': ['roles', 'permissions', 'role_permissions', 'users', 'settings', 'activity_logs', 'media'],
    'Content': ['pages', 'menus', 'menu_items', 'blog_categories', 'blog_tags', 'blog_posts', 'blog_post_tags', 'blog_comments', 'testimonials', 'team_members', 'faqs'],
    'Products': ['product_categories', 'products', 'product_plans', 'product_features', 'product_faqs', 'product_demos', 'product_inquiries', 'product_versions', 'tutorial_categories', 'tutorials'],
    'Business': ['services', 'service_inquiries', 'contact_messages', 'newsletter_subscribers', 'custom_development_requests', 'clients'],
    'SEO/System': ['seo_meta', 'redirects', 'testimonials_videos'],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">MySQL Database Schema</h2>
          <p className="text-slate-400 mt-1">{tables.length} tables • InnoDB • utf8mb4_unicode_ci • MySQL 8.0+</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Schema'}
        </button>
      </div>

      {/* Table Groups */}
      <div className="grid gap-4">
        {Object.entries(tableGroups).map(([group, groupTables]) => (
          <div key={group} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <Database size={18} />
              {group} ({groupTables.length} tables)
            </h3>
            <div className="flex flex-wrap gap-2">
              {groupTables.map(table => (
                <span key={table} className="px-2.5 py-1 bg-slate-700/50 border border-slate-600 rounded-md text-xs font-mono text-slate-300">
                  {table}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Full Schema */}
      <div className="code-block">
        <div className="code-header">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-slate-400" />
            <span className="text-sm text-slate-300 font-mono">schema.sql</span>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">SQL</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="overflow-x-auto max-h-[600px]">
          <code className="text-slate-300">{databaseSchema}</code>
        </pre>
      </div>
    </div>
  );
}

function StructureView() {
  const tree = useMemo(() => buildFileTree(), []);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const allFiles = [...phpFiles, ...adminPhpFiles];
  const selectedFileData = allFiles.find(f => f.path === selectedFile);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* File Tree */}
      <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FolderTree size={16} />
          Project Structure
        </h3>
        <div className="space-y-0.5">
          {tree.map(node => (
            <FileTreeItem
              key={node.path}
              node={node}
              onSelect={setSelectedFile}
              selectedPath={selectedFile || ''}
            />
          ))}
        </div>
      </div>

      {/* File Content */}
      <div className="lg:col-span-2">
        {selectedFileData ? (
          <div className="space-y-4 fade-in">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white">{selectedFileData.name}</h3>
              <p className="text-sm text-slate-400 mt-1">{selectedFileData.description}</p>
              <p className="text-xs text-slate-500 mt-1 font-mono">{selectedFileData.path}</p>
              {'category' in selectedFileData && (selectedFileData as typeof adminPhpFiles[number]).category && (
                <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                  {(selectedFileData as typeof adminPhpFiles[number]).category}
                </span>
              )}
            </div>
            <CodeBlock code={selectedFileData.content} filename={selectedFileData.name} language={selectedFileData.language} />
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <FolderTree size={48} className="text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-400">Select a file</h3>
            <p className="text-sm text-slate-500 mt-1">Click on any file in the tree to view its contents</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CodeView() {
  const [selectedFile, setSelectedFile] = useState(phpFiles[0].path);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const allFiles = [...phpFiles, ...adminPhpFiles];
  
  const categories = useMemo(() => {
    const cats = new Set(adminPhpFiles.map(f => f.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredFiles = allFiles.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || ('category' in f && f.category === categoryFilter);
    return matchesSearch && matchesCategory;
  });

  const currentFile = allFiles.find(f => f.path === selectedFile) || allFiles[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* File List */}
      <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-300 placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300 bg-slate-800'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          {filteredFiles.map(file => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file.path)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFile === file.path
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <div className="font-mono text-xs truncate">{file.name}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{file.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Display */}
      <div className="lg:col-span-3 fade-in">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">{currentFile.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{currentFile.description}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">{currentFile.path}</p>
          {'category' in currentFile && (currentFile as typeof adminPhpFiles[number]).category && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              {(currentFile as typeof adminPhpFiles[number]).category}
            </span>
          )}
        </div>
        <CodeBlock code={currentFile.content} filename={currentFile.name} language={currentFile.language} />
      </div>
    </div>
  );
}

function AdminCodeView() {
  const [selectedFile, setSelectedFile] = useState(adminPhpFiles[0].path);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(() => {
    const cats = new Set(adminPhpFiles.map(f => f.category));
    return ['all', ...Array.from(cats)];
  }, []);

  const filteredFiles = adminPhpFiles.filter(f => 
    categoryFilter === 'all' || f.category === categoryFilter
  );

  const currentFile = adminPhpFiles.find(f => f.path === selectedFile) || adminPhpFiles[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* File List */}
      <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                categoryFilter === cat
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-500 hover:text-slate-300 bg-slate-800'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          {filteredFiles.map(file => (
            <button
              key={file.path}
              onClick={() => setSelectedFile(file.path)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedFile === file.path
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">{file.category}</span>
              </div>
              <div className="font-mono text-xs truncate mt-1">{file.name}</div>
              <div className="text-xs text-slate-500 truncate mt-0.5">{file.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Code Display */}
      <div className="lg:col-span-3 fade-in">
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
              {currentFile.category}
            </span>
          </div>
          <h3 className="text-lg font-semibold text-white">{currentFile.name}</h3>
          <p className="text-sm text-slate-400 mt-1">{currentFile.description}</p>
          <p className="text-xs text-slate-500 mt-1 font-mono">{currentFile.path}</p>
        </div>
        <CodeBlock code={currentFile.content} filename={currentFile.name} language={currentFile.language} />
      </div>
    </div>
  );
}

function CrudModulesView() {
  const allCrudFiles = [...crudBaseFiles, ...crudContentFiles, ...crudProductsFiles, ...crudBusinessFiles, ...crudSystemFiles];
  const [selectedModule, setSelectedModule] = useState('Core');
  const [selectedFile, setSelectedFile] = useState(allCrudFiles[0]?.path || '');

  const modules = useMemo(() => {
    const mods = new Set(allCrudFiles.map(f => f.module));
    return Array.from(mods);
  }, []);

  const moduleFiles = allCrudFiles.filter(f => f.module === selectedModule);
  const currentFile = allCrudFiles.find(f => f.path === selectedFile) || moduleFiles[0];

  const moduleDescriptions: Record<string, string> = {
    'Core': 'Base AdminController + reusable table/form components',
    'Pages': 'CMS pages with TinyMCE, slug auto-gen, SEO fields',
    'Blog': 'Blog posts with categories, tags, featured image, scheduled publishing',
    'Blog Categories': 'Simple CRUD for blog categories',
    'Comments': 'Comment moderation: approve/reject/spam',
    'Media': 'Media library with drag-drop upload, image resize, copy URL',
    'Products': 'Products with repeater fields, drag-drop sortable, multi-upload screenshots',
    'Inquiries': 'Product inquiries with filters, CSV export, status management',
    'Services': 'Services with icon, features repeater, pricing',
    'Testimonials': 'Testimonials with photo, star rating, video URL',
    'Team': 'Team members with social links repeater',
    'FAQs': 'FAQs with category, accordion display, sortable',
    'Messages': 'Contact messages with view, reply, status tracking',
    'Newsletter': 'Newsletter subscribers with export CSV',
    'Users': 'User management with roles, status, password reset',
    'Roles': 'Roles & permissions matrix UI with checkboxes',
    'Settings': 'Tabbed settings: General, Contact, Social, SEO, Email, Payment',
    'Activity Logs': 'Filterable activity log timeline',
    'Redirects': 'URL redirects with from/to/status code',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Admin CRUD Modules</h2>
        <p className="text-slate-400 mt-1">Complete CRUD implementation for all admin modules — {allCrudFiles.length} files across {modules.length} modules</p>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {modules.map(mod => {
          const count = allCrudFiles.filter(f => f.module === mod).length;
          return (
            <button
              key={mod}
              onClick={() => { setSelectedModule(mod); setSelectedFile(allCrudFiles.find(f => f.module === mod)?.path || ''); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedModule === mod
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs truncate">{mod}</div>
            </button>
          );
        })}
      </div>

      {/* Module Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File List */}
        <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-1">{selectedModule}</h3>
          <p className="text-xs text-slate-500 mb-3">{moduleDescriptions[selectedModule] || ''}</p>
          <div className="space-y-1">
            {moduleFiles.map(file => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFile === file.path
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    file.type === 'controller' ? 'bg-green-900/30 text-green-400' :
                    file.type === 'model' ? 'bg-purple-900/30 text-purple-400' :
                    file.type === 'base' ? 'bg-amber-900/30 text-amber-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {file.type === 'view-index' ? 'index' : file.type === 'view-create' ? 'create' : file.type === 'view-edit' ? 'edit' : file.type}
                  </span>
                  <span className="font-mono text-xs truncate">{file.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Code Display */}
        <div className="lg:col-span-3">
          {currentFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  currentFile.type === 'controller' ? 'bg-green-900/30 text-green-400' :
                  currentFile.type === 'model' ? 'bg-purple-900/30 text-purple-400' :
                  currentFile.type === 'base' ? 'bg-amber-900/30 text-amber-400' :
                  'bg-blue-900/30 text-blue-400'
                }`}>{currentFile.type}</span>
                <span className="text-sm text-slate-400">{currentFile.description}</span>
              </div>
              <CodeBlock code={currentFile.content} filename={currentFile.path} language={currentFile.language} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FrontendView() {
  const allFrontFiles = [
    ...frontLayoutFiles,
    ...frontControllerFiles,
    ...frontViewFiles,
    ...frontProductViews,
    ...frontBlogViews,
    ...frontAdditionalViews,
  ];
  
  const [selectedModule, setSelectedModule] = useState('Layout');
  const [selectedFile, setSelectedFile] = useState(allFrontFiles[0]?.path || '');

  const modules = useMemo(() => {
    const mods = new Set(allFrontFiles.map(f => f.module));
    return Array.from(mods);
  }, []);

  const moduleFiles = allFrontFiles.filter(f => f.module === selectedModule);
  const currentFile = allFrontFiles.find(f => f.path === selectedFile) || moduleFiles[0];

  const moduleDescriptions: Record<string, string> = {
    'Layout': 'Main frontend layout with navbar, footer, WhatsApp button, back-to-top',
    'Front': 'Frontend controllers for all public pages',
    'Homepage': 'Homepage with hero, products, testimonials, blog sections',
    'Products': 'Product detail page with screenshots, pricing, demos, FAQ, inquiry form',
    'Blog': 'Blog listing and post detail with TOC, reading progress, comments',
    'Contact': 'Contact page with form, map, contact cards',
    'About': 'About page with story, mission, vision, values, team, timeline',
    'Services': 'Services listing with cards, process steps, CTAs',
    'FAQ': 'FAQ page with categorized accordion',
    'Errors': '404 and 500 error pages with branded design',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Public Frontend</h2>
        <p className="text-slate-400 mt-1">Premium design with TailwindCSS, Alpine.js, AOS animations • {allFrontFiles.length} files</p>
      </div>

      {/* Design Features */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Fonts', value: 'Inter + Sora' },
          { label: 'Colors', value: 'Indigo + Navy' },
          { label: 'Animations', value: 'AOS.js' },
          { label: 'Framework', value: 'Alpine.js' },
        ].map((feat) => (
          <div key={feat.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
            <div className="text-xs text-slate-500">{feat.label}</div>
            <div className="text-sm font-semibold text-white mt-1">{feat.value}</div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {modules.map(mod => {
          const count = allFrontFiles.filter(f => f.module === mod).length;
          return (
            <button
              key={mod}
              onClick={() => { setSelectedModule(mod); setSelectedFile(allFrontFiles.find(f => f.module === mod)?.path || ''); }}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedModule === mod
                  ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs truncate">{mod}</div>
            </button>
          );
        })}
      </div>

      {/* Module Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* File List */}
        <div className="lg:col-span-1 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-blue-400 mb-1">{selectedModule}</h3>
          <p className="text-xs text-slate-500 mb-3">{moduleDescriptions[selectedModule] || ''}</p>
          <div className="space-y-1">
            {moduleFiles.map(file => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFile === file.path
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30'
                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    file.type === 'controller' ? 'bg-green-900/30 text-green-400' :
                    file.type === 'layout' ? 'bg-purple-900/30 text-purple-400' :
                    file.type === 'partial' ? 'bg-amber-900/30 text-amber-400' :
                    'bg-blue-900/30 text-blue-400'
                  }`}>
                    {file.type}
                  </span>
                  <span className="font-mono text-xs truncate">{file.name}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Code Display */}
        <div className="lg:col-span-3">
          {currentFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  currentFile.type === 'controller' ? 'bg-green-900/30 text-green-400' :
                  currentFile.type === 'layout' ? 'bg-purple-900/30 text-purple-400' :
                  currentFile.type === 'partial' ? 'bg-amber-900/30 text-amber-400' :
                  'bg-blue-900/30 text-blue-400'
                }`}>{currentFile.type}</span>
                <span className="text-sm text-slate-400">{currentFile.description}</span>
              </div>
              <CodeBlock code={currentFile.content} filename={currentFile.path} language={currentFile.language} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('admin');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState<'preview' | 'code'>('preview');

  const tabs = [
    { id: 'structure' as Tab, label: 'Project Structure', icon: FolderTree },
    { id: 'database' as Tab, label: 'Database Schema', icon: Database },
    { id: 'code' as Tab, label: 'Source Code', icon: FileCode },
    { id: 'admin' as Tab, label: 'Admin Panel', icon: LayoutDashboard },
    { id: 'crud' as Tab, label: 'Admin CRUD', icon: Shield },
    { id: 'frontend' as Tab, label: 'Frontend', icon: Layout },
  ];

  const features = [
    { icon: Shield, title: 'Security First', desc: 'CSRF protection, password hashing, prepared statements, XSS prevention, rate limiting' },
    { icon: Server, title: 'PHP 8.2+', desc: 'Typed properties, strict_types, enums, readonly, fibers support' },
    { icon: Layout, title: 'Clean MVC', desc: 'Lightweight custom MVC with Router, Controllers, Models, and Views' },
    { icon: Database, title: 'MySQL 8', desc: 'InnoDB, foreign keys, JSON columns, indexes, utf8mb4_unicode_ci' },
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Khybersoft</h1>
                <p className="text-xs text-slate-400 -mt-0.5">PHP MVC Foundation</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-800 px-4 py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-800 to-slate-900 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-medium mb-4">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              Production-Ready Foundation • Admin Panel Included
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Complete PHP 8.2 MVC + Admin Panel
            </h2>
            <p className="text-slate-400 text-lg">
              A production-grade, lightweight custom MVC framework with a premium admin panel.
              Built with security, performance, and scalability in mind.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            {features.map((feature, i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
                <feature.icon size={24} className="text-blue-400 mb-2" />
                <h3 className="font-semibold text-white text-sm">{feature.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-6 mt-8 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{phpFiles.length + adminPhpFiles.length}</div>
              <div className="text-xs text-slate-400">Source Files</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">35+</div>
              <div className="text-xs text-slate-400">Database Tables</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">PHP 8.2</div>
              <div className="text-xs text-slate-400">Runtime</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">MySQL 8</div>
              <div className="text-xs text-slate-400">Database</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">2FA</div>
              <div className="text-xs text-slate-400">TOTP Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'structure' && <StructureView />}
        {activeTab === 'database' && <DatabaseSchemaView />}
        {activeTab === 'code' && <CodeView />}
        {activeTab === 'admin' && (
          <div className="space-y-6">
            {/* Admin Sub-tabs */}
            <div className="flex items-center gap-2 border-b border-slate-700 pb-3">
              <button
                onClick={() => setAdminSubTab('preview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  adminSubTab === 'preview'
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard size={16} />
                Interactive Preview
              </button>
              <button
                onClick={() => setAdminSubTab('code')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  adminSubTab === 'code'
                    ? 'bg-blue-600/20 text-blue-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <FileCode size={16} />
                Admin Source Code
              </button>
            </div>

            {adminSubTab === 'preview' && <AdminPanelPreview />}
            {adminSubTab === 'code' && <AdminCodeView />}
          </div>
        )}
        {activeTab === 'crud' && <CrudModulesView />}
        {activeTab === 'frontend' && <FrontendView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-800/50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">K</span>
              </div>
              <span className="text-sm text-slate-400">Khybersoft MVC Foundation v1.0</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>PHP 8.2 • MySQL 8 • TailwindCSS • Alpine.js</span>
              <a href="https://khybersoft.com" target="_blank" rel="noopener" className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                khybersoft.com <ExternalLink size={12} />
              </a>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <Download size={14} />
                Deployment Instructions
              </h4>
              <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
                <li>Upload all files to your cPanel hosting (public_html for webroot)</li>
                <li>Create MySQL database and import the schema from Database Schema tab</li>
                <li>Copy .env.example to .env and configure database credentials</li>
                <li>Set proper permissions: storage/ and uploads/ need write access (755)</li>
                <li>Ensure PHP 8.2+ is active in cPanel with PDO, mbstring, and JSON extensions</li>
                <li>Set document root to public_html/ directory</li>
                <li>Create a default super_admin user via SQL or a setup script</li>
              </ol>
            </div>
            <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
                <Lock size={14} />
                Security Features
              </h4>
              <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                <li>CSRF token protection on all forms</li>
                <li>Password hashing with bcrypt (cost 12)</li>
                <li>PDO prepared statements (SQL injection prevention)</li>
                <li>XSS prevention via htmlspecialchars output escaping</li>
                <li>Rate limiting: 5 login attempts per 15 minutes</li>
                <li>Session fixation prevention (ID regeneration)</li>
                <li>Account lockout after 5 failed attempts</li>
                <li>Optional TOTP two-factor authentication</li>
                <li>Role-based access control (RBAC)</li>
                <li>Security headers via .htaccess</li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

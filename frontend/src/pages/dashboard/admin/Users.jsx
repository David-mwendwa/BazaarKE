import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';

import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import SelectFilter from '../../../components/common/SelectFilter';
import ContentSkeleton from '../shared/ContentSkeleton';
import DataTable from '../../../components/common/DataTable';
import { Card, CardContent } from '../../../components/ui/Card';
import { Search, ShieldCheck, Store, Trash2, User, Users as UsersIcon } from 'lucide-react';

import { cn } from '../../../lib/utils';
import { useConfirm } from '../../../context/ConfirmContext.js';
import { PageHeader, PageHeaderFilters } from '../shared/PageHeader';
import { IconAction, RowActions } from '../shared/RowActions.jsx';
import apiClient from '../../../api/apiClient.js';
import { useAuth } from '../../../context/AuthContext.jsx';

// The tooltip says what the click *does*, not what the role is called — "Make
// a vendor" reads as an action, where "Vendor" next to a Vendor badge reads as
// a label and gives no hint it's clickable.
const ROLE_ACTIONS = [
  {
    role: 'user',
    icon: User,
    label: 'Make a customer:',
    noun: 'a customer',
    // Said only where it's true. Demoting a vendor strands their listings;
    // demoting an admin doesn't, and a warning that cried wolf on every
    // click is a warning nobody reads by the third row.
    consequence: 'Their products stay in the catalogue, but they lose the dashboard that manages them.',
  },
  {
    role: 'vendor',
    icon: Store,
    label: 'Make a vendor:',
    noun: 'a vendor',
    consequence: 'They can list products and see orders containing them.',
  },
  {
    role: 'admin',
    icon: ShieldCheck,
    label: 'Make an admin:',
    noun: 'an admin',
    consequence:
      'Admins see every order and customer, confirm payments, and can change roles — including yours.',
    tone: 'danger',
  },
];

const roleConfig = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  vendor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  user: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
};

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const confirm = useConfirm();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    apiClient
      .get('/admin/users')
      .then((res) => setUsers(res.data.users || []))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  const handleRoleChange = async (row, action) => {
    const { role, noun, consequence, tone } = action;
    const who = row._id === currentUser?._id ? 'you' : row.email;

    // Demoting yourself is the one role change you can't undo from this
    // screen — the moment it saves, this page stops being yours to open.
    const demotingSelf = row._id === currentUser?._id && role !== 'admin';

    const confirmed = await confirm({
      title: demotingSelf ? `Give up your own admin access?` : `Make ${who} ${noun}?`,
      message: demotingSelf
        ? `You'll be ${noun} the moment this saves, and this screen closes to you. Another admin would have to put you back.`
        : consequence,
      confirmLabel: demotingSelf ? 'Give up admin access' : `Make ${noun}`,
      tone: demotingSelf ? 'danger' : tone,
    });
    if (!confirmed) return;

    try {
      await apiClient.patch(`/admin/user/${row._id}`, { role });
      setUsers((prev) => prev.map((u) => (u._id === row._id ? { ...u, role } : u)));
      toast.success(`${row.email} is now ${noun}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update role.');
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?._id) {
      toast.error("You can't delete your own account.");
      return;
    }
    const target = users.find((u) => u._id === id);
    const confirmed = await confirm({
      title: 'Delete this account?',
      message: `${target?.email || 'This account'} is removed for good. Orders they already placed stay on the platform.`,
      confirmLabel: 'Delete account',
    });
    if (!confirmed) return;
    try {
      await apiClient.delete(`/admin/user/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
      toast.success('User deleted successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const roleOptions = { all: 'All Roles', user: 'Customer', vendor: 'Vendor', admin: 'Admin' };

  const filteredUsers = useMemo(() => {
    let result = [...users];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.email?.toLowerCase().includes(query) ||
          u.firstName?.toLowerCase().includes(query) ||
          u.lastName?.toLowerCase().includes(query)
      );
    }
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [users, searchQuery, roleFilter]);

  if (loading) {
    return <ContentSkeleton showTable={true} rows={10} columns={5} showHeaderSection={true} />;
  }

  const identity = (row) => (
    <div className='flex min-w-0 flex-col'>
      <span className='line-clamp-1 font-medium text-foreground'>
        {row.firstName || row.lastName ? `${row.firstName || ''} ${row.lastName || ''}`.trim() : '—'}
      </span>
      <span className='line-clamp-1 text-xs text-muted-foreground'>{row.email}</span>
    </div>
  );

  const roleBadge = (row) => (
    <Badge
      variant='outline'
      className={cn('border-transparent capitalize', roleConfig[row.role] || roleConfig.user)}>
      {row.role === 'user' ? 'customer' : row.role}
    </Badge>
  );

  // Role is a choice between three, not a switch, so it gets one icon each
  // rather than a single toggle. The role they already hold is disabled — it
  // still takes up its slot, so the delete button stays in the same place on
  // every row instead of sliding under the cursor.
  const rowActions = (row) => (
    <RowActions>
      {ROLE_ACTIONS.map((action) => (
        <IconAction
          key={action.role}
          icon={action.icon}
          label={`${action.label} ${row.firstName || row.email}`}
          disabled={row.role === action.role}
          onClick={() => handleRoleChange(row, action)}
        />
      ))}
      <IconAction
        icon={Trash2}
        label={`Delete ${row.email}`}
        tone='danger'
        onClick={() => handleDelete(row._id)}
      />
    </RowActions>
  );

  const columns = [
    { key: 'firstName', header: 'User', className: 'text-left', cell: identity },
    { key: 'role', header: 'Role', className: 'text-left', cell: roleBadge },
    {
      key: 'createdAt',
      header: 'Joined',
      className: 'text-left',
      cell: (row) => (
        <span className='text-sm text-muted-foreground'>
          {row.createdAt
            ? new Date(row.createdAt).toLocaleDateString('en-KE', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    { key: 'actions', header: 'Actions', sortable: false, className: 'sticky text-right', cell: rowActions },
  ];

  const mobileCard = (row) => (
    <div className='flex flex-col gap-2'>
      <div className='flex items-start justify-between gap-2'>
        {identity(row)}
        {rowActions(row)}
      </div>
      <div className='flex items-center justify-between gap-2'>
        {roleBadge(row)}
        <span className='text-xs text-muted-foreground'>
          {row.createdAt
            ? `Joined ${new Date(row.createdAt).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })}`
            : ''}
        </span>
      </div>
    </div>
  );

  return (
    <div className='space-y-6'>
      <PageHeader title='Users' description={`${users.length} accounts on the platform`}>
        <PageHeaderFilters>
          <div className='relative w-full sm:max-w-xs'>
            <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              type='search'
              placeholder='Search name or email…'
              className='h-9 w-full pl-10'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <SelectFilter
            options={roleOptions}
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder='Role'
            icon='USERS'
            className='h-9 w-full text-sm sm:w-44'
          />
        </PageHeaderFilters>
      </PageHeader>

      <Card>
        <CardContent className='p-0'>
          <DataTable
            columns={columns}
            data={filteredUsers}
            mobileCard={mobileCard}
            defaultRowsPerPage={20}
            rowsPerPageOptions={[20, 50, 100]}
            emptyState={
              <div className='flex flex-col items-center justify-center gap-3 py-12'>
                <UsersIcon className='h-10 w-10 text-muted-foreground' />
                <h3 className='font-medium text-foreground'>No users found</h3>
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsers;

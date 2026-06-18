export function can(permissionList, module, action) {
  const rank = { blocked: 0, view: 1, edit: 2 };
  const requiredLevel = action === 'view' ? 'view' : 'edit';
  const requiredRank = rank[requiredLevel];

  for (const item of permissionList || []) {
    if (typeof item === 'string') {
      if (item === '*' || item === module || item.startsWith(`${module}.`)) {
        return true;
      }
      continue;
    }

    // Modelo novo
    const key = item?.permission_key;
    if (key) {
      const matches = key === '*' || key === module || key.startsWith(`${module}.`);
      if (!matches) {
        continue;
      }
      const accessLevel = item?.access_level || 'blocked';
      if ((rank[accessLevel] ?? 0) >= requiredRank) {
        return true;
      }
      continue;
    }

    // Fallback legado
    if (item?.module === module) {
      if (action === 'view' && item?.can_view) return true;
      if (action === 'edit' && item?.can_edit) return true;
      if (action === 'delete' && item?.can_delete) return true;
    }
  }

  return false;
}

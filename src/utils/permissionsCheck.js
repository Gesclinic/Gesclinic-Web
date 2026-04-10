export function can(permissionList, module, action) {
  const item = permissionList.find((p) => p.module === module);
  if (!item) return false;

  switch (action) {
    case "view":
      return item.can_view;
    case "edit":
      return item.can_edit;
    case "delete":
      return item.can_delete;
    default:
      return false;
  }
}

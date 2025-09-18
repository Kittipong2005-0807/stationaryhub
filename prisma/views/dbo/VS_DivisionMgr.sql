SELECT
  DISTINCT CostCenters.CostCenter,
  CostCenters.L2,
  dbo.UserWithRoles.CurrentEmail,
  dbo.UserWithRoles.FullNameEng,
  dbo.UserWithRoles.PostNameEng,
  dbo.UserWithRoles.OrgCode3,
  dbo.UserWithRoles.OrgTDesc3,
  dbo.UserWithRoles.OrgCode4,
  dbo.UserWithRoles.OrgTDesc4
FROM
  THRYGSD002.sapportal.dbo.CostCenters AS CostCenters
  JOIN dbo.UserWithRoles ON CostCenters.L2 = dbo.UserWithRoles.EmpCode;
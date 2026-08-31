import { prisma } from '@/lib/db/prisma'

export async function getCurrentUserProfile(userId: number) {
  return prisma.userTable.findUnique({
    where: { userId },
    select: {
      userId: true,
      userName: true,
      roleName: true,
      status: true,
      displayName: true,
      emailId: true,
      lastLoginTime: true,
      createdDate: true,
      employee: {
        select: {
          empFirstName: true,
          empLastName: true,
          empGender: true,
          empAddress: true,
          empCity: true,
          empStateLegacy: true,
          empPincode: true,
          empMobileNo: true,
          empPhoneNo: true,
          empEmailId: true,
        },
      },
    },
  })
}

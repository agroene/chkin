import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the module
vi.mock("./auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("./db", () => ({
  prisma: {
    member: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    organizationRole: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => new Headers()),
}));

import {
  hasOrganizationAccess,
  getUserRoleInOrganization,
  hasPermission,
  getUserOrganizations,
} from "./auth-utils";
import { prisma } from "./db";

describe("auth-utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("hasOrganizationAccess", () => {
    it("returns true when user is a member", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        organizationId: "org-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasOrganizationAccess("user-1", "org-1");
      expect(result).toBe(true);
    });

    it("returns false when user is not a member", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

      const result = await hasOrganizationAccess("user-1", "org-1");
      expect(result).toBe(false);
    });

    it("returns false on database error", async () => {
      vi.mocked(prisma.member.findUnique).mockRejectedValue(
        new Error("DB error")
      );

      const result = await hasOrganizationAccess("user-1", "org-1");
      expect(result).toBe(false);
    });
  });

  describe("getUserRoleInOrganization", () => {
    it("returns role when user is a member", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        organizationId: "org-1",
        role: "provider_admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getUserRoleInOrganization("user-1", "org-1");
      expect(result).toBe("provider_admin");
    });

    it("returns null when user is not a member", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

      const result = await getUserRoleInOrganization("user-1", "org-1");
      expect(result).toBeNull();
    });
  });

  describe("hasPermission", () => {
    it("returns true when user has the permission", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        organizationId: "org-1",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.organizationRole.findUnique).mockResolvedValue({
        id: "role-1",
        organizationId: "org-1",
        role: "admin",
        permissions: JSON.stringify(["read:patients", "write:patients"]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission("user-1", "org-1", "read:patients");
      expect(result).toBe(true);
    });

    it("returns false when user lacks the permission", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue({
        id: "member-1",
        userId: "user-1",
        organizationId: "org-1",
        role: "staff",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(prisma.organizationRole.findUnique).mockResolvedValue({
        id: "role-1",
        organizationId: "org-1",
        role: "staff",
        permissions: JSON.stringify(["read:patients"]),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await hasPermission("user-1", "org-1", "delete:patients");
      expect(result).toBe(false);
    });

    it("returns false when user is not a member", async () => {
      vi.mocked(prisma.member.findUnique).mockResolvedValue(null);

      const result = await hasPermission("user-1", "org-1", "read:patients");
      expect(result).toBe(false);
    });
  });

  describe("getUserOrganizations", () => {
    it("returns organizations with roles", async () => {
      vi.mocked(prisma.member.findMany).mockResolvedValue([
        {
          id: "member-1",
          userId: "user-1",
          organizationId: "org-1",
          role: "admin",
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: {
            id: "org-1",
            name: "Test Practice",
            slug: "test-practice",
            logo: null,
            metadata: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ] as never);

      const result = await getUserOrganizations("user-1");
      expect(result).toEqual([
        {
          id: "org-1",
          name: "Test Practice",
          slug: "test-practice",
          role: "admin",
        },
      ]);
    });

    it("returns empty array on database error", async () => {
      vi.mocked(prisma.member.findMany).mockRejectedValue(
        new Error("DB error")
      );

      const result = await getUserOrganizations("user-1");
      expect(result).toEqual([]);
    });
  });
});

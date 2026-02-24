import { PrismaService } from '../../prisma/prisma.service';

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateUniqueSlug(
  name: string,
  prisma: PrismaService,
  excludeId?: string,
): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let suffix = 0;

  while (true) {
    const existing = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (!existing || (excludeId && existing.id === excludeId)) {
      return slug;
    }

    suffix++;
    slug = `${baseSlug}-${suffix}`;
  }
}

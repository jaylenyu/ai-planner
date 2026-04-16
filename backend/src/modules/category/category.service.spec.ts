import { ConflictException, NotFoundException } from '@nestjs/common';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  const prisma = {
    category: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  let service: CategoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CategoryService(prisma);
  });

  it('create는 중복 이름이면 409를 던진다', async () => {
    prisma.category.create.mockRejectedValue({ code: 'P2002' });

    await expect(
      service.create('user-1', { name: '데이트', color: '#111111' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('update는 소유하지 않은 카테고리면 404를 던진다', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'cat-1', { name: '새 카테고리' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete는 소유하지 않은 카테고리면 404를 던진다', async () => {
    prisma.category.findFirst.mockResolvedValue(null);

    await expect(service.delete('user-1', 'cat-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

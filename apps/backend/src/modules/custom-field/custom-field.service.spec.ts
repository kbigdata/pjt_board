import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomFieldType, Prisma } from '@prisma/client';
import { CustomFieldService } from './custom-field.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('CustomFieldService', () => {
  let service: CustomFieldService;
  let prisma: Record<string, any>;

  const mockBoard = { id: 'board-1', title: 'Test Board' };
  const mockCard = { id: 'card-1', boardId: 'board-1', title: 'Test Card' };

  const mockFieldDef = {
    id: 'field-1',
    boardId: 'board-1',
    name: 'Priority Score',
    fieldType: CustomFieldType.NUMBER,
    options: null,
    position: 1024,
    isRequired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockDropdownFieldDef = {
    id: 'field-2',
    boardId: 'board-1',
    name: 'Status',
    fieldType: CustomFieldType.DROPDOWN,
    options: ['Option A', 'Option B'],
    position: 2048,
    isRequired: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockFieldValue = {
    id: 'value-1',
    cardId: 'card-1',
    fieldId: 'field-1',
    value: 42,
    field: mockFieldDef,
  };

  beforeEach(async () => {
    prisma = {
      board: { findUnique: jest.fn() },
      card: { findUnique: jest.fn() },
      customFieldDefinition: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      customFieldValue: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomFieldService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomFieldService>(CustomFieldService);
  });

  describe('createDefinition', () => {
    it('should create a custom field definition without options', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.customFieldDefinition.findFirst.mockResolvedValue(null);
      prisma.customFieldDefinition.create.mockResolvedValue(mockFieldDef);

      const result = await service.createDefinition('board-1', {
        name: 'Priority Score',
        fieldType: CustomFieldType.NUMBER,
      });

      expect(result).toEqual(mockFieldDef);
      expect(prisma.customFieldDefinition.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          name: 'Priority Score',
          fieldType: CustomFieldType.NUMBER,
          options: Prisma.JsonNull,
          position: 1024,
          isRequired: false,
        },
      });
    });

    it('should create a dropdown field with options', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.customFieldDefinition.findFirst.mockResolvedValue({ position: 1024 });
      prisma.customFieldDefinition.create.mockResolvedValue(mockDropdownFieldDef);

      const result = await service.createDefinition('board-1', {
        name: 'Status',
        fieldType: CustomFieldType.DROPDOWN,
        options: ['Option A', 'Option B'],
        isRequired: true,
      });

      expect(result.options).toEqual(['Option A', 'Option B']);
      expect(result.isRequired).toBe(true);
      expect(prisma.customFieldDefinition.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          name: 'Status',
          fieldType: CustomFieldType.DROPDOWN,
          options: ['Option A', 'Option B'],
          position: 2048,
          isRequired: true,
        },
      });
    });

    it('should assign position as max+1024 when fields exist', async () => {
      prisma.board.findUnique.mockResolvedValue(mockBoard);
      prisma.customFieldDefinition.findFirst.mockResolvedValue({ position: 3072 });
      prisma.customFieldDefinition.create.mockResolvedValue({ ...mockFieldDef, position: 4096 });

      await service.createDefinition('board-1', {
        name: 'New Field',
        fieldType: CustomFieldType.TEXT,
      });

      expect(prisma.customFieldDefinition.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ position: 4096 }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent board', async () => {
      prisma.board.findUnique.mockResolvedValue(null);

      await expect(
        service.createDefinition('non-existent', {
          name: 'Test',
          fieldType: CustomFieldType.TEXT,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findDefinitionsByBoardId', () => {
    it('should return all definitions ordered by position', async () => {
      prisma.customFieldDefinition.findMany.mockResolvedValue([mockFieldDef, mockDropdownFieldDef]);

      const result = await service.findDefinitionsByBoardId('board-1');

      expect(result).toHaveLength(2);
      expect(prisma.customFieldDefinition.findMany).toHaveBeenCalledWith({
        where: { boardId: 'board-1' },
        orderBy: { position: 'asc' },
      });
    });

    it('should return empty array when no definitions exist', async () => {
      prisma.customFieldDefinition.findMany.mockResolvedValue([]);

      const result = await service.findDefinitionsByBoardId('board-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('updateDefinition', () => {
    it('should update name of a custom field definition', async () => {
      const updated = { ...mockFieldDef, name: 'Updated Name' };
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockFieldDef);
      prisma.customFieldDefinition.update.mockResolvedValue(updated);

      const result = await service.updateDefinition('field-1', { name: 'Updated Name' });

      expect(result.name).toBe('Updated Name');
      expect(prisma.customFieldDefinition.update).toHaveBeenCalledWith({
        where: { id: 'field-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update options of a dropdown field', async () => {
      const updated = { ...mockDropdownFieldDef, options: ['A', 'B', 'C'] };
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockDropdownFieldDef);
      prisma.customFieldDefinition.update.mockResolvedValue(updated);

      const result = await service.updateDefinition('field-2', { options: ['A', 'B', 'C'] });

      expect(result.options).toEqual(['A', 'B', 'C']);
    });

    it('should update isRequired flag', async () => {
      const updated = { ...mockFieldDef, isRequired: true };
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockFieldDef);
      prisma.customFieldDefinition.update.mockResolvedValue(updated);

      const result = await service.updateDefinition('field-1', { isRequired: true });

      expect(result.isRequired).toBe(true);
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      prisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(
        service.updateDefinition('non-existent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDefinition', () => {
    it('should delete a custom field definition', async () => {
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockFieldDef);
      prisma.customFieldDefinition.delete.mockResolvedValue(mockFieldDef);

      await service.deleteDefinition('field-1');

      expect(prisma.customFieldDefinition.delete).toHaveBeenCalledWith({
        where: { id: 'field-1' },
      });
    });

    it('should throw NotFoundException for non-existent definition', async () => {
      prisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.deleteDefinition('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('setValue', () => {
    it('should create a new custom field value', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockFieldDef);
      prisma.customFieldValue.upsert.mockResolvedValue(mockFieldValue);

      const result = await service.setValue('card-1', 'field-1', 42);

      expect(result).toEqual(mockFieldValue);
      expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
        where: { cardId_fieldId: { cardId: 'card-1', fieldId: 'field-1' } },
        create: { cardId: 'card-1', fieldId: 'field-1', value: 42 },
        update: { value: 42 },
        include: { field: true },
      });
    });

    it('should update an existing custom field value (upsert)', async () => {
      const updatedValue = { ...mockFieldValue, value: 99 };
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockFieldDef);
      prisma.customFieldValue.upsert.mockResolvedValue(updatedValue);

      const result = await service.setValue('card-1', 'field-1', 99);

      expect(result.value).toBe(99);
      expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith({
        where: { cardId_fieldId: { cardId: 'card-1', fieldId: 'field-1' } },
        create: { cardId: 'card-1', fieldId: 'field-1', value: 99 },
        update: { value: 99 },
        include: { field: true },
      });
    });

    it('should set a boolean value for CHECKBOX fields', async () => {
      const boolValue = { ...mockFieldValue, value: true };
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.customFieldDefinition.findUnique.mockResolvedValue({
        ...mockFieldDef,
        fieldType: CustomFieldType.CHECKBOX,
      });
      prisma.customFieldValue.upsert.mockResolvedValue(boolValue);

      const result = await service.setValue('card-1', 'field-1', true);

      expect(result.value).toBe(true);
    });

    it('should set null to clear a value', async () => {
      const nullValue = { ...mockFieldValue, value: null };
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.customFieldDefinition.findUnique.mockResolvedValue(mockFieldDef);
      prisma.customFieldValue.upsert.mockResolvedValue(nullValue);

      await service.setValue('card-1', 'field-1', null);

      expect(prisma.customFieldValue.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: { cardId: 'card-1', fieldId: 'field-1', value: Prisma.JsonNull },
          update: { value: Prisma.JsonNull },
        }),
      );
    });

    it('should throw NotFoundException for non-existent card', async () => {
      prisma.card.findUnique.mockResolvedValue(null);

      await expect(service.setValue('non-existent', 'field-1', 42)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for non-existent field definition', async () => {
      prisma.card.findUnique.mockResolvedValue(mockCard);
      prisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      await expect(service.setValue('card-1', 'non-existent', 42)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getValuesByCardId', () => {
    it('should return all custom field values with field definitions included', async () => {
      prisma.customFieldValue.findMany.mockResolvedValue([mockFieldValue]);

      const result = await service.getValuesByCardId('card-1');

      expect(result).toHaveLength(1);
      expect(prisma.customFieldValue.findMany).toHaveBeenCalledWith({
        where: { cardId: 'card-1' },
        include: { field: true },
        orderBy: { field: { position: 'asc' } },
      });
    });

    it('should return empty array when no values exist', async () => {
      prisma.customFieldValue.findMany.mockResolvedValue([]);

      const result = await service.getValuesByCardId('card-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteValue', () => {
    it('should delete a custom field value', async () => {
      prisma.customFieldValue.findUnique.mockResolvedValue(mockFieldValue);
      prisma.customFieldValue.delete.mockResolvedValue(mockFieldValue);

      await service.deleteValue('card-1', 'field-1');

      expect(prisma.customFieldValue.delete).toHaveBeenCalledWith({
        where: { cardId_fieldId: { cardId: 'card-1', fieldId: 'field-1' } },
      });
    });

    it('should throw NotFoundException when value does not exist', async () => {
      prisma.customFieldValue.findUnique.mockResolvedValue(null);

      await expect(service.deleteValue('card-1', 'non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getBoardIdByFieldId', () => {
    it('should return boardId for existing field definition', async () => {
      prisma.customFieldDefinition.findUnique.mockResolvedValue({ boardId: 'board-1' });

      const result = await service.getBoardIdByFieldId('field-1');

      expect(result).toBe('board-1');
    });

    it('should return null for non-existent field definition', async () => {
      prisma.customFieldDefinition.findUnique.mockResolvedValue(null);

      const result = await service.getBoardIdByFieldId('non-existent');

      expect(result).toBeNull();
    });
  });
});

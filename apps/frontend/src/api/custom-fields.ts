import apiClient from './client';

export interface CustomFieldDefinition {
  id: string;
  boardId: string;
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'DROPDOWN' | 'CHECKBOX';
  options: string[] | null;
  position: number;
  isRequired: boolean;
}

export interface CustomFieldValue {
  id: string;
  cardId: string;
  fieldId: string;
  value: unknown;
  field: CustomFieldDefinition;
}

export const customFieldsApi = {
  getDefinitions: (boardId: string) =>
    apiClient.get<CustomFieldDefinition[]>(`/boards/${boardId}/custom-fields`).then((r) => r.data),

  createDefinition: (
    boardId: string,
    data: { name: string; fieldType: string; options?: string[]; isRequired?: boolean },
  ) =>
    apiClient
      .post<CustomFieldDefinition>(`/boards/${boardId}/custom-fields`, data)
      .then((r) => r.data),

  updateDefinition: (id: string, data: { name?: string; options?: string[]; isRequired?: boolean }) =>
    apiClient.patch<CustomFieldDefinition>(`/custom-fields/${id}`, data).then((r) => r.data),

  deleteDefinition: (id: string) =>
    apiClient.delete(`/custom-fields/${id}`).then((r) => r.data),

  getValues: (cardId: string) =>
    apiClient.get<CustomFieldValue[]>(`/cards/${cardId}/custom-fields`).then((r) => r.data),

  setValue: (cardId: string, fieldId: string, value: unknown) =>
    apiClient.put(`/cards/${cardId}/custom-fields/${fieldId}`, { value }).then((r) => r.data),

  deleteValue: (cardId: string, fieldId: string) =>
    apiClient.delete(`/cards/${cardId}/custom-fields/${fieldId}`).then((r) => r.data),
};

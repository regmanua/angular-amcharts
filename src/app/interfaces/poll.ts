export interface IPoll {
  id: string;
  questions: IPollDetail[];
}

export interface IPollGroup {
  formId: string;
  groupId: string;
}

export interface IPollDetail {
  data: IPollData[];
  questionId: string;
  question: string;
  total: number;
  type?: string;
  sum?: number;
  avg?: number;
}

export interface IPollData {
  result: string;
  count: number;
  percentage?: number;
}

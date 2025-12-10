export enum EstadoAtual  { 
    ToDo = 'ToDo', 
    Doing = 'Doing', 
    Done = 'Done'
}

export interface TaskModel {
  id: string;
  descricao: string;
  tipoId: string;
  gestorId: string;
  programadorId: string | null;
  ordem: number;
  estado: EstadoAtual;
  dataCriacao: string;
  dataPrevistaInicio?: string;
  dataPrevistaFim?: string;
  dataRealInicio?: string;
  dataRealFim?: string;
  storyPoints?: number;
}

export interface TaskType {
  id: string;
  name: string;
  color: string;
}

export interface AppUser {
  id: string;
  username: string;
  password?: string,
  displayName: string;
  role: 'Gestor' | 'Programador';
  gestorId?: string | null;
}

export type LaunchEvent = {
    id: number;
    nome: string;
    data_inicio: string;
    data_fim: string;
    is_custom: boolean;
    nome_personalizado?: string;
};

export type Survey = {
    id: string;
    nome: string;
};
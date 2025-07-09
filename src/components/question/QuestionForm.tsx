"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { showAlertModal } from "@/lib/modals";

// Tipos de Dados
type Option = {
  texto: string;
  peso: number;
};

type QuestionData = {
  id?: string;
  texto: string;
  tipo: string;
  opcoes: Option[];
};

type QuestionFormProps = {
  initialData?: QuestionData | null;
};

export default function QuestionForm({ initialData }: QuestionFormProps) {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [question, setQuestion] = useState({
    texto: initialData?.texto || "",
    tipo: initialData?.tipo || "Texto Aberto",
  });

  const [options, setOptions] = useState<Option[]>(
    initialData?.opcoes?.map((opt) => ({
      texto: opt.texto || "",
      peso: (opt as any).peso ?? (opt as any).pontos ?? 0,
    })) || []
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Efeito para configurar as opções iniciais para "Sim / Não" ao carregar
  useEffect(() => {
    if (initialData?.tipo === "Sim / Não" && initialData.opcoes) {
      setOptions(initialData.opcoes);
    }
  }, [initialData]);

  // Função para lidar com a mudança do tipo da pergunta
  const handleTypeChange = (newType: string) => {
    setQuestion({ ...question, tipo: newType });

    if (newType === "Sim / Não") {
      // Apenas altera se as opções não forem já "Sim" e "Não" para não sobrescrever
      if (
        options.length !== 2 ||
        options[0].texto !== "Sim" ||
        options[1].texto !== "Não"
      ) {
        setOptions([
          { texto: "Sim", peso: 1 },
          { texto: "Não", peso: 0 },
        ]);
      }
    }
  };

  const handleOptionChange = (
    index: number,
    field: "texto" | "peso",
    value: string | number
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, { texto: "", peso: 0 }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const questionToSave = {
        id: initialData?.id,
        ...question,
        opcoes:
          question.tipo === "Múltipla Escolha" || question.tipo === "Sim / Não"
            ? options
            : [],
        modified_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("perguntas").upsert(questionToSave);

      if (error) throw error;

      showAlertModal("Sucesso!", "Pergunta salva com sucesso!");
      router.push("/perguntas");
      router.refresh();
    } catch (err: any) {
      showAlertModal("Erro ao Salvar", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">
          {initialData ? "Editar Pergunta" : "Criar Nova Pergunta"}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="texto"
              className="block text-sm font-medium text-slate-700"
            >
              Texto da Pergunta
            </label>
            <textarea
              id="texto"
              value={question.texto}
              onChange={(e) =>
                setQuestion({ ...question, texto: e.target.value })
              }
              required
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium">
              Tipo de Resposta
            </label>
            <select
              id="tipo"
              value={question.tipo}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="mt-1 w-full border-slate-300 rounded-md"
            >
              <option>Texto Aberto</option>
              <option>Múltipla Escolha</option>
              <option>Sim / Não</option>
            </select>
          </div>
          {(question.tipo === "Múltipla Escolha" ||
            question.tipo === "Sim / Não") && (
            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  Opções de Resposta
                </label>
                <label className="block text-sm font-medium text-slate-500 pr-12">
                  Pontos
                </label>
              </div>
              <div className="space-y-3">
                {options.map((opt, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Texto da opção"
                      value={opt.texto}
                      onChange={(e) =>
                        handleOptionChange(index, "texto", e.target.value)
                      }
                      className="flex-grow p-2 border rounded-md"
                      disabled={question.tipo === "Sim / Não"}
                    />
                    <input
                      type="number"
                      placeholder="Pontos"
                      value={opt.peso}
                      onChange={(e) =>
                        handleOptionChange(
                          index,
                          "peso",
                          parseInt(e.target.value, 10) || 0
                        )
                      }
                      className="w-24 p-2 border rounded-md text-center"
                    />
                    {question.tipo === "Múltipla Escolha" && (
                      <button
                        type="button"
                        onClick={() => removeOption(index)}
                        className="text-red-500 hover:text-red-700 font-bold text-xl"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {question.tipo === "Múltipla Escolha" && (
                <button
                  type="button"
                  onClick={addOption}
                  className="mt-3 text-sm text-blue-600 font-semibold hover:text-blue-800"
                >
                  + Adicionar Opção
                </button>
              )}
            </div>
          )}
          <div className="flex justify-end pt-4 gap-4">
            <button
              type="button"
              onClick={() => router.push("/perguntas")}
              className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-800 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 hover:bg-slate-700"
            >
              {isSubmitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

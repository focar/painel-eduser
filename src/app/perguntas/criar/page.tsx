// src/app/perguntas/criar/page.tsx
// Esta página simplesmente renderiza o QuestionForm sem passar nenhuma prop.
// O formulário vai entender que deve começar em branco.

import QuestionForm from "@/components/question/QuestionForm";

export default function CriarPerguntaPage() {
  // Chamamos o formulário sem a prop 'initialData'.
  return <QuestionForm />;
}

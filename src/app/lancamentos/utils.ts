export const eventColorMap: { [key: string]: string } = {
    'padrão': 'bg-white text-slate-800', 'planejamento': 'bg-[#af6813] text-white',
    'pré-lançamento': 'bg-[#fea43d] text-white', 'início da captação': 'bg-[#91258e] text-white',
    'cpl 1': 'bg-[#c563dc] text-white', 'live aprofundamento cpl1': 'bg-[#5d77ab] text-white',
    'cpl 2': 'bg-[#182777] text-white', 'cpl 3': 'bg-[#00aef1] text-white',
    'live encerramento': 'bg-[#01aa9c] text-white', 'carrinho aberto': 'bg-[#01a550] text-white',
    'custom_1': 'bg-[#ec98ca] text-white', 'custom_2': 'bg-[#ed008d] text-white',
};

export const getEventColorClasses = (eventName: string): string => {
    const lowerCaseName = eventName.toLowerCase();
    return eventColorMap[lowerCaseName] || eventColorMap['padrão'];
};
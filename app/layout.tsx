import type { Metadata } from 'next';
export const metadata:Metadata={title:'Кадры · РГПУ',description:'Общая редактируемая карта сотрудников и подразделений'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}

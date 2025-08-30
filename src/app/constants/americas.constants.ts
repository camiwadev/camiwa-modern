export type CountryAmericas = {
    code: string;   // ISO2
    name: string;
    dial: string;   // +NN o +1-XXX si aplica NANP
    flag?: string;
    cities: string[];
  };

export const AMERICAS: CountryAmericas[] = [
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷', cities: ['Buenos Aires','Córdoba','Rosario','Mendoza','La Plata'] },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴', cities: ['La Paz','Santa Cruz','Cochabamba','El Alto'] },
  { code: 'BR', name: 'Brasil', dial: '+55', flag: '🇧🇷', cities: ['São Paulo','Rio de Janeiro','Brasília','Salvador','Belo Horizonte'] },
  { code: 'CA', name: 'Canadá', dial: '+1', flag: '🇨🇦', cities: ['Toronto','Vancouver','Montreal','Calgary','Ottawa'] },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱', cities: ['Santiago','Valparaíso','Concepción','Antofagasta','La Serena'] },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴', cities: ['Bogotá','Medellín','Cali','Barranquilla','Cartagena'] },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷', cities: ['San José','Alajuela','Cartago','Heredia'] },
  { code: 'CU', name: 'Cuba', dial: '+53', flag: '🇨🇺', cities: ['La Habana','Santiago de Cuba','Camagüey','Holguín'] },
  { code: 'DO', name: 'Rep. Dominicana', dial: '+1-809', flag: '🇩🇴', cities: ['Santo Domingo','Santiago','La Romana','San Pedro'] },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨', cities: ['Quito','Guayaquil','Cuenca','Ambato'] },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻', cities: ['San Salvador','Santa Ana','San Miguel'] },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹', cities: ['Ciudad de Guatemala','Quetzaltenango','Escuintla'] },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳', cities: ['Tegucigalpa','San Pedro Sula','La Ceiba'] },
  { code: 'JM', name: 'Jamaica', dial: '+1-876', flag: '🇯🇲', cities: ['Kingston','Montego Bay','Spanish Town'] },
  { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽', cities: ['CDMX','Guadalajara','Monterrey','Puebla','Tijuana'] },
  { code: 'NI', name: 'Nicaragua', dial: '+505', flag: '🇳🇮', cities: ['Managua','León','Granada'] },
  { code: 'PA', name: 'Panamá', dial: '+507', flag: '🇵🇦', cities: ['Ciudad de Panamá','Colón','David'] },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾', cities: ['Asunción','Ciudad del Este','Encarnación'] },
  { code: 'PE', name: 'Perú', dial: '+51', flag: '🇵🇪', cities: ['Lima','Arequipa','Trujillo','Cusco'] },
  { code: 'PR', name: 'Puerto Rico', dial: '+1-787', flag: '🇵🇷', cities: ['San Juan','Bayamón','Ponce'] },
  { code: 'TT', name: 'Trinidad y Tobago', dial: '+1-868', flag: '🇹🇹', cities: ['Puerto España','San Fernando','Chaguanas'] },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾', cities: ['Montevideo','Salto','Paysandú'] },
  { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸', cities: ['New York','Los Ángeles','Chicago','Miami','Houston'] },
  { code: 'VE', name: 'Venezuela', dial: '+58', flag: '🇻🇪', cities: ['Caracas','Maracaibo','Valencia','Barquisimeto'] },
  { code: 'BS', name: 'Bahamas', dial: '+1-242', flag: '🇧🇸', cities: ['Nassau','Freeport'] },
  { code: 'BB', name: 'Barbados', dial: '+1-246', flag: '🇧🇧', cities: ['Bridgetown','Speightstown'] },
  { code: 'GY', name: 'Guyana', dial: '+592', flag: '🇬🇾', cities: ['Georgetown','Linden'] },
  { code: 'SR', name: 'Surinam', dial: '+597', flag: '🇸🇷', cities: ['Paramaribo','Lelydorp'] },
  { code: 'BZ', name: 'Belice', dial: '+501', flag: '🇧🇿', cities: ['Ciudad de Belice','San Ignacio'] },
];

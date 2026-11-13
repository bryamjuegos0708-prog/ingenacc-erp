// Referencias transcritas de los folletos aportados. Sin precio ni stock inferidos.
const groups=[
 ['Honda','Motoguadañas','002.jpg','UMK450T|UMK435T|UMR435T|UMR450T'],
 ['Honda','Motofumigadoras','002.jpg','WJR4025T'],['Honda','Cortacésped','002.jpg','HRJ216'],
 ['Honda','Motobombas','003.jpg','WX10T|WL20XH|WH20XT|WB30XH|WL30XH|WT30XK4|WT40XK3'],
 ['Honda','Motores','004.jpg','GX35T|GX50T|GX120T3|GX160H2|GX200T2 SÚPER|GX270H2|GX390H2|GX430T|GX630RHX|GP160H|GP200H|GX200T2 MEGA|GX390T2 MEGA|GX430T MEGA|GXR120RT'],
 ['Honda','Generadores','005.jpg','EG1000|EZ3000|EG5000|EZ6500|EG6500|EM10000|EU10|EU22'],['Honda','Motocultores','005.jpg','FQ650'],
 ['Eco Power','Fumigadoras','006.jpg','SP3525Q'],['Eco Power','Motoguadañas','006.jpg','BC35CQ'],
 ['Bonhoeffer','Motores diésel','008.jpg','BON-P-DE-13.0HP|BON-P-DE-16.0HP|BON-P-DE-18.0HP|BON-P-DE-20.0HP'],
 ['Bonhoeffer','Trituradoras','008.jpg','BON-P-DWC-1015|BON-P-GWC-710|BON-P-GWC-708|BON-P-GWC-15SH'],
 ['Bonhoeffer','Desbrozadoras','009.jpg','BON-P-BC36|BON-P-BC45|BON-ET-BC53|BON-P-BBC45|BON-P-HT45|BPP33TP|BBC42WP|BBC-37-P4S|BBC-37-BP4S'],
 ['Bonhoeffer','Motosierras','009.jpg','BON-P-CS40|BON-P-CS55|BON-P-CS65|BON-P-CS92'],
 ['Bonhoeffer','Atomizadoras','009.jpg','BON-P-MD52|BON-P-MD82'],['Bonhoeffer','Pulverizadoras','009.jpg','BON-P-HS15L-SOL|BON-P-KS22|BON-P-KS26|BON-P-KS37'],
 ['Bonhoeffer','Fumigadoras','009.jpg','BON-P-MS20L|BON-P-MS20L-1B|BON-P-EMS20-Batería'],
 ['Bonhoeffer','Ahoyadoras','010.jpg','BON-P-EA52'],['Bonhoeffer','Hidrolavadoras','010.jpg','BON-E-PW-1400W|BON-E-PW-1600W|BON-E-PW-2000W|BON-P-PW-3.0KW'],
 ['Bonhoeffer','Bombas sumergibles','010.jpg','BON-P-SP-1.0HP|BON-P-SP-2.0HP|BON-P-SP-3.0HP'],['Bonhoeffer','Electrobombas','010.jpg','BON-P-CP-0.5HP|BON-P-CP-1HP|BON-P-CP-2HP'],
 ['Bonhoeffer','Motores eléctricos','010.jpg','BON-EM-LRPM-1.0HP|BON-EM-LRPM-2.0HP|BON-EM-LRPM-3.0HP|BON-EM-LRPM-4.0HP|BON-EM-HRPM-1.0HP|BON-EM-HRPM-2.0HP|BON-EM-HRPM-3.0HP|BON-EM-HRPM-4.0HP'],
 ['Bonhoeffer','Motobombas','011.jpg','BON-P-WP2.0-196|BON-P-WP3.0-196|BON-P-WP4.0-272|BON-P-WP1.5-224HL|BON-P-WP2.0-224HL|BON-P-WP3.0-420HL|BON-P-DWP-2.0-10.0HP|BON-P-DWP-3.0-16.0HP'],
 ['Bonhoeffer','Generadores','011.jpg','BON-P-GI-1.8KW|BON-P-GI-3.8KW|BON-P-GG-1.3KW|BON-P-GG-2.8KW|BON-P-GG-3.7KW|BON-P-GG-5.0KW|BON-P-GG-7.5KW|BON-P-GG-9.0KW|BON-P-GG-13.5KW'],
 ['Bonhoeffer','Soldadoras','011.jpg','BON-WM-DUAL-200A|BON-WM-MULTI-200A'],
 ['Bonhoeffer','Cortacésped','012.jpg','BON-P-LM-22|BLT42MP-452'],['Bonhoeffer','Motocultores','012.jpg','BON-GT-950T|BON-TILLER-950C|BON-TILLER-950DI|BT350TC'],
 ['Bonhoeffer','Generadores diésel','013.jpg','BON-P-DG-6.5KW|BON-P-SDG-12KW|BON-DG-17KW-1P|BON-DG-20KW-1P|BON-DG-30KW-3P|BON-DG-40KW-3P|BON-DG-55KW-3P'],
 ['Bonhoeffer','Motores a gasolina','013.jpg','BON-P-GE-3.0HP|BON-P-GE-5.5HP|BON-P-GE-7.0HP|BON-P-GE-9.0HP|BON-P-GE-13.0HP|BON-P-GE-16.0HP|BON-P-GE-24.0HP|BON-P-GE-34.0HP'],['Bonhoeffer','Motores de navegación','013.jpg','BON-P-ME-4H-16HP|BON-P-ME-4L60B']
];
export const catalogReferences=groups.flatMap(([brand,category,source,models])=>models.split('|').map(model=>({id:`${brand}:${model}`,brand,category,model,name:`${category} ${model}`,source})));

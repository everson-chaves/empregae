const services = [
  "Diarista",
  "Faxineira",
  "Passadeira",
  "Cozinheira",
  "Cuidadora",
  "Babá",
  "Eletricista",
  "Encanador",
  "Pintor",
  "Pedreiro",
  "Marido de aluguel",
  "Montador de móveis",
  "Jardineiro",
  "Piscineiro",
  "Costureira",
  "Manicure",
  "Cabeleireira",
  "Barbeiro",
  "Maquiadora",
  "Depiladora",
  "Massagista",
  "Personal trainer",
  "Professor particular",
  "Reforço escolar",
  "Aulas de música",
  "Motorista",
  "Motoboy",
  "Entregador",
  "Carreteiro",
  "Mudanças",
  "Frete pequeno",
  "Lavador de carros",
  "Mecânico",
  "Borracheiro",
  "Técnico de celular",
  "Técnico de computador",
  "Instalador de internet",
  "Instalador de câmera",
  "Chaveiro",
  "Vidraceiro",
  "Serralheiro",
  "Soldador",
  "Gesseiro",
  "Marceneiro",
  "Tapeceiro",
  "Lavanderia",
  "Pet sitter",
  "Passeador de cães",
  "Cuidador de quintal",
  "Auxiliar de eventos",
];

const sampleLocations = [
  {
    label: "Jardim Panamá, Campo Grande - MS",
    neighborhood: "Jardim Panamá",
    city: "Campo Grande",
    lat: -20.4686,
    lon: -54.6639,
  },
  {
    label: "Popular, Campo Grande - MS",
    neighborhood: "Popular",
    city: "Campo Grande",
    lat: -20.4329,
    lon: -54.6221,
  },
  {
    label: "Santo Amaro, Campo Grande - MS",
    neighborhood: "Santo Amaro",
    city: "Campo Grande",
    lat: -20.4356,
    lon: -54.6518,
  },
  {
    label: "Ana Maria do Couto, Campo Grande - MS",
    neighborhood: "Ana Maria do Couto",
    city: "Campo Grande",
    lat: -20.4014,
    lon: -54.6129,
  },
];

const seededWorkers = [
  {
    id: "cg-01",
    name: "Luciana Ferreira",
    phone: "5567998765432",
    service: "Diarista",
    neighborhood: "Jardim Panamá",
    city: "Campo Grande",
    address: "Rua Marquês de Herval, Jardim Panamá, Campo Grande - MS",
    lat: -20.4694,
    lon: -54.6648,
    price: "R$ 150 diária",
    rating: 5.0,
    plan: "featured",
    availability: "Segunda, quarta e sábado",
    photo: "https://randomuser.me/api/portraits/women/44.jpg",
    description:
      "Diarista com experiência em limpeza pesada e manutenção semanal. Atende casas e apartamentos com organização, pontualidade e cuidado com detalhes.",
    review: "Chegou no horário e deixou a casa pronta para receber visita.",
  },
  {
    id: "cg-02",
    name: "Rafael Nogueira",
    phone: "5567998881234",
    service: "Eletricista",
    neighborhood: "Popular",
    city: "Campo Grande",
    address: "Avenida Júlio de Castilho, Popular, Campo Grande - MS",
    lat: -20.4338,
    lon: -54.6234,
    price: "A partir de R$ 100",
    rating: 4.9,
    plan: "featured",
    availability: "Todos os dias",
    photo: "https://randomuser.me/api/portraits/men/32.jpg",
    description:
      "Eletricista residencial para chuveiros, tomadas, disjuntores, luminárias e pequenos reparos. Explica o problema antes de executar o serviço.",
    review: "Resolveu uma queda de energia no mesmo dia.",
  },
  {
    id: "cg-03",
    name: "Patrícia Gomes",
    phone: "5567998123456",
    service: "Passadeira",
    neighborhood: "Santo Amaro",
    city: "Campo Grande",
    address: "Rua Santa Quitéria, Santo Amaro, Campo Grande - MS",
    lat: -20.4362,
    lon: -54.6527,
    price: "R$ 90 por período",
    rating: 4.8,
    plan: "free",
    availability: "Terça e quinta",
    photo: "https://randomuser.me/api/portraits/women/68.jpg",
    description:
      "Passadeira com atendimento em domicílio. Cuida de roupas sociais, uniformes, roupas do dia a dia e organização de peças por categoria.",
    review: "Roupas muito bem passadas e atendimento cuidadoso.",
  },
  {
    id: "cg-04",
    name: "Antônio Duarte",
    phone: "5567998456789",
    service: "Pintor",
    neighborhood: "Ana Maria do Couto",
    city: "Campo Grande",
    address: "Rua Arara Azul, Ana Maria do Couto, Campo Grande - MS",
    lat: -20.4025,
    lon: -54.6141,
    price: "R$ 38 por m²",
    rating: 4.7,
    plan: "free",
    availability: "Agenda flexível",
    photo: "https://randomuser.me/api/portraits/men/76.jpg",
    description:
      "Pintor para quartos, salas, fachadas pequenas, portões e retoques. Faz orçamento claro e combina prazo antes de iniciar.",
    review: "Pintura limpa, acabamento bom e entregou no prazo.",
  },
  {
    id: "cg-05",
    name: "Marina Costa",
    phone: "5567998877665",
    service: "Costureira",
    neighborhood: "Popular",
    city: "Campo Grande",
    address: "Rua dos Crisântemos, Popular, Campo Grande - MS",
    lat: -20.4314,
    lon: -54.6209,
    price: "Sob orçamento",
    rating: 4.9,
    plan: "featured",
    availability: "Segunda a sexta",
    photo: "https://randomuser.me/api/portraits/women/12.jpg",
    description:
      "Costureira para barras, ajustes, pequenos consertos, troca de zíper e reformas simples. Atendimento rápido para peças do dia a dia.",
    review: "Ajustou duas calças com ótimo acabamento.",
  },
  {
    id: "cg-06",
    name: "João Batista",
    phone: "5567998999900",
    service: "Marido de aluguel",
    neighborhood: "Santo Amaro",
    city: "Campo Grande",
    address: "Rua das Garças, Santo Amaro, Campo Grande - MS",
    lat: -20.438,
    lon: -54.6506,
    price: "A partir de R$ 120",
    rating: 4.8,
    plan: "free",
    availability: "Sábados e domingos",
    photo: "https://randomuser.me/api/portraits/men/41.jpg",
    description:
      "Instala suportes, prateleiras, cortinas, monta móveis e faz pequenos reparos residenciais. Leva ferramentas básicas para o atendimento.",
    review: "Montou o armário e ainda ajustou uma porta solta.",
  },
  {
    id: "cg-07",
    name: "Eliane Martins",
    phone: "5567998212121",
    service: "Diarista",
    neighborhood: "Ana Maria do Couto",
    city: "Campo Grande",
    address: "Rua dos Buritis, Ana Maria do Couto, Campo Grande - MS",
    lat: -20.3999,
    lon: -54.6113,
    price: "R$ 140 diária",
    rating: 4.8,
    plan: "free",
    availability: "Quarta e sexta",
    photo: "https://randomuser.me/api/portraits/women/25.jpg",
    description:
      "Diarista para limpeza geral, organização de cozinha, banheiro, quartos e áreas externas pequenas. Atende com materiais do cliente.",
    review: "Muito caprichosa e organizada.",
  },
  {
    id: "cg-08",
    name: "Wesley Andrade",
    phone: "5567998554433",
    service: "Encanador",
    neighborhood: "Jardim Panamá",
    city: "Campo Grande",
    address: "Rua Guaporé, Jardim Panamá, Campo Grande - MS",
    lat: -20.4668,
    lon: -54.6618,
    price: "A partir de R$ 110",
    rating: 4.6,
    plan: "featured",
    availability: "Atende emergências",
    photo: "https://randomuser.me/api/portraits/men/64.jpg",
    description:
      "Encanador para vazamentos, troca de torneira, sifão, descarga, registros e pequenos reparos hidráulicos em casas e apartamentos.",
    review: "Foi direto no problema e explicou o orçamento.",
  },
  {
    id: "cg-09",
    name: "Célia Rocha",
    phone: "5567998771122",
    service: "Cuidadora",
    neighborhood: "Santo Amaro",
    city: "Campo Grande",
    address: "Rua São Borja, Santo Amaro, Campo Grande - MS",
    lat: -20.4344,
    lon: -54.654,
    price: "R$ 170 por plantão",
    rating: 5.0,
    plan: "featured",
    availability: "Plantões diurnos",
    photo: "https://randomuser.me/api/portraits/women/57.jpg",
    description:
      "Cuidadora de idosos para companhia, rotina de alimentação, lembretes de remédio e apoio em tarefas leves do dia.",
    review: "Atenciosa, paciente e muito responsável.",
  },
  {
    id: "cg-10",
    name: "Bruno Almeida",
    phone: "5567998332211",
    service: "Eletricista",
    neighborhood: "Jardim Panamá",
    city: "Campo Grande",
    address: "Rua Taquari, Jardim Panamá, Campo Grande - MS",
    lat: -20.4712,
    lon: -54.6661,
    price: "A partir de R$ 95",
    rating: 4.7,
    plan: "free",
    availability: "Segunda a sábado",
    photo: "https://randomuser.me/api/portraits/men/22.jpg",
    description:
      "Eletricista para instalações simples, ventilador de teto, tomadas, interruptores e revisão de pontos com mau contato.",
    review: "Serviço rápido e deixou tudo funcionando.",
  },
];

const realisticProfiles = [
  {
    name: "Maria José",
    photo: "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 150 diária",
    availability: "Segunda, quarta e sábado",
  },
  {
    name: "Seu Antônio",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 100",
    availability: "Segunda a sábado",
  },
  {
    name: "Dona Cida",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 90 por período",
    availability: "Terça e quinta",
  },
  {
    name: "João Pereira",
    photo: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 38 por m²",
    availability: "Agenda flexível",
  },
  {
    name: "Neide Santos",
    photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=220&q=80",
    price: "A partir de orçamento",
    availability: "Segunda a sexta",
  },
  {
    name: "Carlos Roberto",
    photo: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 120",
    availability: "Sábado e domingo",
  },
  {
    name: "Eliane Aparecida",
    photo: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 140 diária",
    availability: "Quarta e sexta",
  },
  {
    name: "Wesley Silva",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 110",
    availability: "Atende emergências",
  },
  {
    name: "Célia Rocha",
    photo: "https://images.unsplash.com/photo-1557555187-23d685287bc3?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 170 por plantão",
    availability: "Plantões diurnos",
  },
  {
    name: "Bruno Almeida",
    photo: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=220&q=80",
    price: "A partir de R$ 95",
    availability: "Segunda a sábado",
  },
];

seededWorkers.forEach((worker, index) => {
  const profile = realisticProfiles[index];
  if (!profile) return;
  worker.name = profile.name;
  worker.photo = profile.photo;
  worker.price = profile.price;
  worker.availability = profile.availability;
});

let workers = loadWorkers();
let activeService = "";
let selectedSearchLocation = null;
let selectedSignupLocation = null;
let searchTimer = null;
let signupTimer = null;

const serviceFilter = document.querySelector("#serviceFilter");
const serviceInput = document.querySelector("#serviceInput");
const addressFilter = document.querySelector("#addressFilter");
const addressSuggestions = document.querySelector("#addressSuggestions");
const locationPreview = document.querySelector("#locationPreview");
const radiusFilter = document.querySelector("#radiusFilter");
const workersGrid = document.querySelector("#workersGrid");
const categoryList = document.querySelector("#categoryList");
const resultsTitle = document.querySelector("#resultsTitle");
const workerCount = document.querySelector("#workerCount");
const profileModal = document.querySelector("#profileModal");
const profileContent = document.querySelector("#profileContent");
const workerAddressInput = document.querySelector("#workerAddressInput");
const workerAddressSuggestions = document.querySelector("#workerAddressSuggestions");

function loadWorkers() {
  const saved = localStorage.getItem("empregae-workers-br-v2");
  if (!saved) return seededWorkers;
  const parsed = JSON.parse(saved);
  if (parsed.some((worker) => /Luciana|Rafael|Patr/i.test(worker.name))) {
    localStorage.removeItem("empregae-workers-br-v1");
    localStorage.removeItem("empregae-workers-br-v2");
    return seededWorkers;
  }
  return parsed;
}

function saveWorkers() {
  localStorage.setItem("empregae-workers-br-v2", JSON.stringify(workers));
}

function populateServices() {
  services.forEach((service) => {
    serviceFilter.append(new Option(service, service));
    serviceInput.append(new Option(service, service));
  });
}

function renderCategories() {
  categoryList.innerHTML = "";
  services.forEach((service) => {
    const total = workers.filter((worker) => worker.service === service).length;
    const button = document.createElement("button");
    button.className = `category-button${activeService === service ? " is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `<span>${service}</span>${total ? `<strong>${total}</strong>` : ""}`;
    button.addEventListener("click", () => {
      activeService = activeService === service ? "" : service;
      serviceFilter.value = activeService;
      renderAll();
    });
    categoryList.append(button);
  });
}

function getFilteredWorkers() {
  const service = serviceFilter.value || activeService;
  const query = normalize(addressFilter.value);
  const radius = Number(radiusFilter.value);

  return workers
    .map((worker) => ({
      ...worker,
      computedDistance: selectedSearchLocation ? distanceKm(selectedSearchLocation, worker) : null,
    }))
    .filter((worker) => {
      const matchesService = !service || worker.service === service;
      const text = normalize(`${worker.address} ${worker.neighborhood} ${worker.city}`);
      const matchesText =
        selectedSearchLocation ||
        !query ||
        text.includes(query) ||
        query.length >= 3;
      const matchesRadius = !selectedSearchLocation || worker.computedDistance <= radius;
      return matchesService && matchesText && matchesRadius;
    })
    .sort((a, b) => {
      const planScore = Number(b.plan === "featured") - Number(a.plan === "featured");
      if (planScore !== 0) return planScore;
      return (a.computedDistance ?? 0) - (b.computedDistance ?? 0);
    });
}

function normalize(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function distanceKm(origin, worker) {
  const earthRadius = 6371;
  const dLat = toRadians(worker.lat - origin.lat);
  const dLon = toRadians(worker.lon - origin.lon);
  const lat1 = toRadians(origin.lat);
  const lat2 = toRadians(worker.lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Number((earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function initials(name) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function mapsLink(location) {
  return `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lon}`;
}

function whatsappLink(worker) {
  const message = encodeURIComponent(
    `Olá, ${worker.name}! Encontrei seu perfil no Empregaê e gostaria de falar sobre um serviço de ${worker.service}.`
  );
  return `https://wa.me/${worker.phone}?text=${message}`;
}

function avatarHtml(worker) {
  if (!worker.photo) return `<span class="avatar-fallback">${initials(worker.name)}</span>`;
  return `<img class="avatar-img" src="${worker.photo}" alt="Foto de ${worker.name}" />`;
}

function planBadge(worker) {
  if (worker.plan === "featured") return '<span class="tag tag-featured">Verificado</span>';
  return '<span class="tag">Perfil gratuito</span>';
}

function getAvailability(worker) {
  const schedules = {
    Diarista: [
      { day: "Segunda", time: "08:00 - 12:00" },
      { day: "Quarta", time: "08:00 - 16:00" },
      { day: "Sábado", time: "09:00 - 13:00" },
    ],
    Cuidadora: [
      { day: "Segunda", time: "07:00 - 19:00" },
      { day: "Quarta", time: "07:00 - 19:00" },
      { day: "Sexta", time: "Plantão noturno" },
    ],
    Babá: [
      { day: "Terça", time: "13:00 - 18:00" },
      { day: "Quinta", time: "13:00 - 18:00" },
      { day: "Sábado", time: "08:00 - 14:00" },
    ],
    Eletricista: [
      { day: "Hoje", time: "14:00 - 18:00" },
      { day: "Amanhã", time: "08:00 - 12:00" },
      { day: "Sábado", time: "09:00 - 15:00" },
    ],
  };

  return schedules[worker.service] || [
    { day: "Segunda", time: "08:00 - 12:00" },
    { day: "Quarta", time: "13:00 - 17:00" },
    { day: "Sexta", time: "09:00 - 15:00" },
  ];
}

function getReviews(worker) {
  return [
    { name: "Cliente verificado", rating: 5, text: worker.review },
    { name: "Morador do bairro", rating: 5, text: "Atendimento educado, combinou tudo antes e cumpriu o horário." },
    { name: "Serviço recente", rating: 4.8, text: "Boa comunicação pelo WhatsApp e serviço bem explicado." },
  ];
}

function matchScore(worker) {
  const base = worker.plan === "featured" ? 94 : 88;
  const distanceBonus = selectedSearchLocation && worker.computedDistance !== null ? Math.max(0, 6 - worker.computedDistance) : 3;
  return Math.min(99, Math.round(base + distanceBonus));
}

function bookingQuestions(service) {
  const common = [
    { label: "Data desejada", type: "date" },
    { label: "Horário preferido", type: "select", options: ["Manhã", "Tarde", "Noite", "A combinar"] },
    { label: "Endereço do atendimento", type: "text", placeholder: "Rua, número, bairro e cidade" },
  ];

  const specific = {
    Diarista: [
      { label: "Quais ambientes?", type: "checkboxes", options: ["Sala", "Cozinha", "Quartos", "Banheiros", "Área externa"] },
      { label: "Também precisa cozinhar almoço?", type: "select", options: ["Não", "Sim", "Talvez"] },
      { label: "Tem material de limpeza no local?", type: "select", options: ["Sim", "Não", "Alguns itens"] },
    ],
    Faxineira: [
      { label: "Tipo de limpeza", type: "select", options: ["Leve", "Pesada", "Pós-obra", "Organização"] },
      { label: "Quais ambientes?", type: "checkboxes", options: ["Sala", "Cozinha", "Quartos", "Banheiros", "Quintal"] },
    ],
    Cuidadora: [
      { label: "Idade da pessoa cuidada", type: "text", placeholder: "Ex: 78 anos" },
      { label: "Possui doença ou limitação?", type: "textarea", placeholder: "Ex: Alzheimer, diabetes, mobilidade reduzida" },
      { label: "Tem restrição alimentar?", type: "textarea", placeholder: "Descreva alimentação, remédios e cuidados" },
      { label: "Precisa dormir no local?", type: "select", options: ["Não", "Sim", "A combinar"] },
    ],
    Babá: [
      { label: "Idade da criança", type: "text", placeholder: "Ex: 4 anos" },
      { label: "Horário para cuidar", type: "text", placeholder: "Ex: 13h às 18h" },
      { label: "Precisa preparar comida?", type: "select", options: ["Não", "Sim", "Lanche simples"] },
      { label: "Alguma alergia ou cuidado especial?", type: "textarea", placeholder: "Descreva se houver" },
    ],
    Eletricista: [
      { label: "Qual problema?", type: "checkboxes", options: ["Chuveiro", "Tomada", "Luminária", "Disjuntor", "Curto ou queda de energia"] },
      { label: "É emergência?", type: "select", options: ["Não", "Sim, hoje", "Pode agendar"] },
    ],
    Encanador: [
      { label: "Qual problema?", type: "checkboxes", options: ["Vazamento", "Torneira", "Descarga", "Ralo", "Caixa d'água"] },
      { label: "Tem fotos do problema?", type: "select", options: ["Sim", "Não"] },
    ],
  };

  return [...common, ...(specific[service] || [{ label: "Descreva o serviço", type: "textarea", placeholder: "Conte o que você precisa" }])];
}

function renderWorkers() {
  const filtered = getFilteredWorkers();
  if (workerCount) workerCount.textContent = workers.length;
  resultsTitle.textContent = activeService || serviceFilter.value || "Todos os profissionais";
  workersGrid.innerHTML = "";

  if (!filtered.length) {
    workersGrid.innerHTML =
      '<div class="empty-state">Nenhum profissional encontrado com esses filtros. Tente aumentar o raio ou buscar outro bairro.</div>';
    return;
  }

  filtered.forEach((worker) => {
    const distanceLabel =
      worker.computedDistance !== null ? `${worker.computedDistance} km de você` : worker.neighborhood;
    const card = document.createElement("article");
    card.className = "worker-card";
    card.innerHTML = `
      <div class="worker-top">
        <span class="avatar">${avatarHtml(worker)}</span>
        <div>
          <h3>${worker.name}</h3>
          <span>${worker.service}</span>
        </div>
      </div>
      <div class="tag-row">
        <span class="tag">${distanceLabel}</span>
        <span class="tag tag-match">${matchScore(worker)}% match</span>
        <span class="tag">★ ${worker.rating}</span>
        ${planBadge(worker)}
      </div>
      <p>${worker.description}</p>
      <a class="map-link" href="${mapsLink(worker)}" target="_blank" rel="noreferrer">Ver região no Maps</a>
      <strong>${worker.price}</strong>
      <div class="card-actions">
        <button type="button" data-profile="${worker.id}">Ver perfil</button>
        <button class="hire-button" style="background:#1f8f62;color:#fff;border:0;" type="button" data-book="${worker.id}">Reservar</button>
      </div>
    `;
    workersGrid.append(card);
  });
}

function renderAll() {
  activeService = serviceFilter.value || activeService;
  renderCategories();
  renderWorkers();
}

function enhanceBio(raw, service, neighborhood) {
  const cleaned = raw.trim().replace(/\s+/g, " ");
  const serviceLabel = service.toLowerCase();
  return `Sou profissional de ${serviceLabel} e atendo na região de ${neighborhood || "minha cidade"}. ${cleaned}. Trabalho com responsabilidade, pontualidade e cuidado no atendimento. Combino valores e horários com clareza antes do serviço.`;
}

function openProfile(workerId) {
  const source = getFilteredWorkers().find((worker) => String(worker.id) === String(workerId));
  const worker = source || workers.find((item) => String(item.id) === String(workerId));
  const distanceLabel =
    worker.computedDistance !== null && worker.computedDistance !== undefined
      ? `${worker.computedDistance} km de você`
      : worker.neighborhood;

  profileContent.innerHTML = `
    <div class="profile-detail">
      <div class="worker-top profile-head">
        <span class="avatar avatar-large">${avatarHtml(worker)}</span>
        <div>
          <p class="eyebrow">${worker.service}</p>
          <h2>${worker.name}</h2>
        </div>
      </div>
      <div class="tag-row">
        <span class="tag">${distanceLabel}</span>
        <span class="tag tag-match">${matchScore(worker)}% match</span>
        <span class="tag">${worker.neighborhood}, ${worker.city}</span>
        <span class="tag">★ ${worker.rating}</span>
        <span class="tag">${worker.price}</span>
        ${planBadge(worker)}
      </div>
      <p>${worker.description}</p>
      <p><strong>Endereço/região:</strong> ${worker.address}</p>
      <p><strong>Disponibilidade:</strong> ${worker.availability}</p>
      <div class="availability-grid">
        ${getAvailability(worker)
          .map((slot) => `<span><strong>${slot.day}</strong>${slot.time}</span>`)
          .join("")}
      </div>
      ${
        worker.plan === "featured"
          ? '<p><strong>Destaque ativo:</strong> este perfil aparece com selo verificado e prioridade visual.</p>'
          : '<p><strong>Plano gratuito:</strong> este perfil aparece normalmente na busca. O destaque é opcional.</p>'
      }
      <div class="reviews-list">
        ${getReviews(worker)
          .map((review) => `<div class="review"><strong>${review.rating}★ ${review.name}</strong><span>${review.text}</span></div>`)
          .join("")}
      </div>
      <div class="profile-actions">
        <a class="map-link button-like" href="${mapsLink(worker)}" target="_blank" rel="noreferrer">Abrir no Maps</a>
        <button class="whatsapp-link" type="button" data-book="${worker.id}">Reservar horário</button>
      </div>
      ${
        worker.plan === "featured"
          ? ""
          : `<button class="upgrade-link" type="button" data-upgrade="${worker.id}">Simular destaque por R$ 9,90/mês</button>`
      }
    </div>
  `;
  profileModal.showModal();
}

function openFeaturedPlan(workerId) {
  const worker = workers.find((item) => String(item.id) === String(workerId));
  if (!worker) return;

  profileContent.innerHTML = `
    <div class="profile-detail">
      <div class="worker-top profile-head">
        <span class="avatar avatar-large">${avatarHtml(worker)}</span>
        <div>
          <p class="eyebrow">Destaque opcional</p>
          <h2>Plano de R$ 9,90/mês</h2>
        </div>
      </div>
      <p>O perfil gratuito continua aparecendo na busca. O destaque é opcional para quem quiser mais visibilidade.</p>
      <div class="contribution-box">
        <strong>Inclui selo verificado, prioridade visual, mais fotos, agenda profissional e descrição melhorada com IA.</strong>
        <span>No produto real, o pagamento pode ser feito por Pix recorrente, cartão ou assinatura mensal simples.</span>
      </div>
      <p><strong>Importante:</strong> nunca esconderemos quem usa grátis. O destaque só melhora a apresentação, sem impedir oportunidades para outros trabalhadores.</p>
      <div class="profile-actions">
        <button class="button-like" type="button" id="backToProfile">Voltar</button>
        <button class="whatsapp-link" type="button" id="simulateFeatured">Simular destaque</button>
      </div>
    </div>
  `;
  profileModal.showModal();
  document.querySelector("#backToProfile").addEventListener("click", () => openProfile(worker.id));
  document.querySelector("#simulateFeatured").addEventListener("click", () => {
    worker.plan = "featured";
    saveWorkers();
    renderAll();
    openProfile(worker.id);
  });
}

function renderQuestion(question, index) {
  if (question.type === "select") {
    return `
      <label>
        ${question.label}
        <select>
          ${question.options.map((option) => `<option>${option}</option>`).join("")}
        </select>
      </label>
    `;
  }

  if (question.type === "textarea") {
    return `
      <label class="full">
        ${question.label}
        <textarea rows="3" placeholder="${question.placeholder || ""}"></textarea>
      </label>
    `;
  }

  if (question.type === "checkboxes") {
    return `
      <fieldset class="booking-checks">
        <legend>${question.label}</legend>
        ${question.options
          .map(
            (option) => `
            <label>
              <input type="checkbox" name="question-${index}" />
              ${option}
            </label>
          `
          )
          .join("")}
      </fieldset>
    `;
  }

  return `
    <label>
      ${question.label}
      <input type="${question.type || "text"}" placeholder="${question.placeholder || ""}" />
    </label>
  `;
}

function openBooking(workerId) {
  const worker = workers.find((item) => String(item.id) === String(workerId));
  if (!worker) return;
  const questions = bookingQuestions(worker.service);

  profileContent.innerHTML = `
    <form class="profile-detail booking-form" id="bookingForm">
      <div class="worker-top profile-head">
        <span class="avatar avatar-large">${avatarHtml(worker)}</span>
        <div>
          <p class="eyebrow">Pré-agendamento</p>
          <h2>${worker.service} com ${worker.name}</h2>
        </div>
      </div>
      <div class="contribution-box">
        <strong>${matchScore(worker)}% de match com sua busca</strong>
        <span>Preencha os detalhes. O profissional recebe a solicitação e precisa aceitar em até 4 horas. O serviço só fica confirmado depois do aceite.</span>
      </div>
      <div class="availability-grid">
        ${getAvailability(worker)
          .map((slot) => `<span><strong>${slot.day}</strong>${slot.time}</span>`)
          .join("")}
      </div>
      <div class="booking-fields">
        ${questions.map((question, index) => renderQuestion(question, index)).join("")}
      </div>
      <div class="profile-actions">
        <button class="button-like" type="button" id="backToProfile">Voltar</button>
        <button class="whatsapp-link" type="submit">Enviar solicitação</button>
      </div>
    </form>
  `;
  profileModal.showModal();
  document.querySelector("#backToProfile").addEventListener("click", () => openProfile(worker.id));
  document.querySelector("#bookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    profileContent.innerHTML = `
      <div class="profile-detail">
        <p class="eyebrow">Solicitação enviada</p>
        <h2>Agora é com ${worker.name}</h2>
        <p>Seu pedido foi enviado para o profissional. Ele tem até 4 horas para aceitar, recusar ou sugerir outro horário.</p>
        <div class="contribution-box">
          <strong>Status: aguardando aceite</strong>
          <span>Quando o profissional aceitar, o cliente recebe a confirmação e pode conversar pelo WhatsApp para combinar os últimos detalhes.</span>
        </div>
        <div class="profile-actions">
          <button class="button-like" type="button" id="closeBooking">Fechar</button>
          <a class="whatsapp-link" href="${whatsappLink(worker)}" target="_blank" rel="noreferrer">Enviar mensagem</a>
        </div>
      </div>
    `;
    document.querySelector("#closeBooking").addEventListener("click", () => profileModal.close());
  });
}

function collectBookingAnswers(form) {
  const answers = [];
  form.querySelectorAll("input, select, textarea").forEach((field) => {
    if (field.type === "checkbox") return;
    const label = field.closest("label")?.childNodes[0]?.textContent?.trim();
    const value = field.value?.trim();
    if (label && value) answers.push({ label, value });
  });

  form.querySelectorAll(".booking-checks").forEach((fieldset) => {
    const label = fieldset.querySelector("legend")?.textContent || "Itens do serviço";
    const checked = [...fieldset.querySelectorAll("input:checked")].map((input) =>
      input.parentElement.textContent.trim()
    );
    if (checked.length) answers.push({ label, value: checked.join(", ") });
  });

  return answers;
}

function estimateBooking(worker, answers) {
  const text = normalize(answers.map((answer) => `${answer.label} ${answer.value}`).join(" "));
  const ranges = {
    Diarista: [150, 230, 6],
    Faxineira: [130, 210, 5],
    Cuidadora: [170, 340, 8],
    Babá: [120, 260, 5],
    Eletricista: [100, 240, 2],
    Encanador: [110, 260, 2],
    Pintor: [220, 650, 7],
    "Marido de aluguel": [120, 280, 3],
  };
  const [min, max, baseHours] = ranges[worker.service] || [90, 260, 3];
  let hours = baseHours;
  if (text.includes("cozinha")) hours += 1;
  if (text.includes("quartos")) hours += 1;
  if (text.includes("almoco")) hours += 1;
  if (text.includes("dormir")) hours += 8;
  if (text.includes("emergencia") || text.includes("hoje")) hours += 1;
  return {
    price: `R$ ${min} a R$ ${max}`,
    hours: `${hours}h estimadas`,
    urgency: text.includes("emergencia") || text.includes("hoje") ? "Urgente" : "Agendado",
  };
}

function bookingSummary(worker, answers) {
  const estimate = estimateBooking(worker, answers);
  const rows = answers
    .slice(0, 7)
    .map((answer) => `<li><strong>${answer.label}:</strong> ${answer.value}</li>`)
    .join("");
  return {
    estimate,
    html: `
      <div class="ai-summary">
        <span>Resumo gerado pela IA</span>
        <h3>${worker.service} com ${worker.name}</h3>
        <p>Pedido organizado para o profissional avaliar antes de aceitar.</p>
        <ul>${rows || "<li>Cliente prefere combinar os detalhes pelo aplicativo.</li>"}</ul>
        <div class="summary-metrics">
          <strong>${estimate.price}</strong>
          <strong>${estimate.hours}</strong>
          <strong>${estimate.urgency}</strong>
        </div>
      </div>
    `,
  };
}

function openSmartBooking(workerId) {
  const worker = workers.find((item) => String(item.id) === String(workerId));
  if (!worker) return;
  const questions = bookingQuestions(worker.service);

  profileContent.innerHTML = `
    <form class="profile-detail booking-form" id="smartBookingForm">
      <div class="worker-top profile-head">
        <span class="avatar avatar-large">${avatarHtml(worker)}</span>
        <div>
          <p class="eyebrow">Reserva Inteligente</p>
          <h2>${worker.service} com ${worker.name}</h2>
        </div>
      </div>
      <div class="contribution-box">
        <strong>${matchScore(worker)}% de match com sua busca</strong>
        <span>Responda os detalhes. A IA organiza o pedido, estima tempo e faixa de valor. O profissional aceita, altera ou recusa em até 4 horas.</span>
      </div>
      <div class="availability-grid">
        ${getAvailability(worker).map((slot) => `<span><strong>${slot.day}</strong>${slot.time}</span>`).join("")}
      </div>
      <div class="booking-fields">
        ${questions.map((question, index) => renderQuestion(question, index)).join("")}
      </div>
      <div class="profile-actions">
        <button class="button-like" type="button" id="backToProfile">Voltar</button>
        <button class="whatsapp-link" type="submit">Gerar reserva inteligente</button>
      </div>
    </form>
  `;
  profileModal.showModal();
  document.querySelector("#backToProfile").addEventListener("click", () => openProfile(worker.id));
  document.querySelector("#smartBookingForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const answers = collectBookingAnswers(event.currentTarget);
    const summary = bookingSummary(worker, answers);
    profileContent.innerHTML = `
      <div class="profile-detail">
        <p class="eyebrow">Solicitação enviada</p>
        <h2>Aguardando resposta de ${worker.name}</h2>
        <p>O serviço ainda não está confirmado. O profissional tem até 4 horas para aceitar, sugerir outro horário, sugerir outro valor ou recusar.</p>
        ${summary.html}
        <div class="provider-panel">
          <span>Visão do profissional</span>
          <h3>Novo pedido recebido</h3>
          <p>${summary.estimate.price} · ${summary.estimate.hours} · ${matchScore(worker)}% de compatibilidade</p>
          <div class="provider-actions">
            <button type="button">Aceitar</button>
            <button type="button">Sugerir horário</button>
            <button type="button">Sugerir valor</button>
            <button type="button">Recusar</button>
          </div>
        </div>
        <div class="contribution-box">
          <strong>Status: aguardando aceite</strong>
          <span>Quando o profissional aprovar, o cliente recebe a confirmação e pode conversar pelo WhatsApp para os últimos detalhes.</span>
        </div>
        <div class="profile-actions">
          <button class="button-like" type="button" id="closeBooking">Fechar</button>
          <a class="whatsapp-link" href="${whatsappLink(worker)}" target="_blank" rel="noreferrer">Enviar mensagem</a>
        </div>
      </div>
    `;
    document.querySelector("#closeBooking").addEventListener("click", () => profileModal.close());
  });
}

function renderLocationPreview() {
  if (!selectedSearchLocation) {
    locationPreview.hidden = true;
    locationPreview.innerHTML = "";
    return;
  }

  locationPreview.hidden = false;
  locationPreview.innerHTML = `
    <span>Buscando perto de: <strong>${selectedSearchLocation.label}</strong></span>
    <a href="${mapsLink(selectedSearchLocation)}" target="_blank" rel="noreferrer">Abrir no Maps</a>
  `;
}

function localAddressMatches(query) {
  const normalized = normalize(query);
  if (!normalized) return [];

  const fromNeighborhoods = sampleLocations.filter((place) => normalize(place.label).includes(normalized));
  const typedPlace =
    query.length >= 3
      ? [
          {
            label: `${query} - buscar em todo o Brasil`,
            neighborhood: query,
            city: "Brasil",
            lat: -14.235,
            lon: -51.9253,
            broadSearch: true,
          },
        ]
      : [];
  const fromWorkers = workers
    .filter((worker) => normalize(worker.address).includes(normalized))
    .map((worker) => ({
      label: worker.address,
      neighborhood: worker.neighborhood,
      city: worker.city,
      lat: worker.lat,
      lon: worker.lon,
    }));

  return [...fromNeighborhoods, ...fromWorkers, ...typedPlace].slice(0, 5);
}

async function fetchAddressSuggestions(query) {
  if (query.length < 3) return [];

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "br");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "pt-BR");
  url.searchParams.set("q", `${query}, Brasil`);

  const response = await fetch(url);
  if (!response.ok) return [];
  const places = await response.json();
  return places.map((place) => ({
    label: place.display_name,
    neighborhood:
      place.address?.suburb ||
      place.address?.neighbourhood ||
      place.address?.city_district ||
      place.name ||
      "Região",
    city:
      place.address?.city ||
      place.address?.town ||
      place.address?.municipality ||
      place.address?.state ||
      "Brasil",
    lat: Number(place.lat),
    lon: Number(place.lon),
  }));
}

function renderSuggestionBox(box, places, emptyText) {
  if (!places.length) {
    box.hidden = false;
    box.innerHTML = `<button class="suggestion-button" type="button"><strong>${emptyText}</strong><span>Digite bairro, rua, cidade e estado.</span></button>`;
    box._places = [];
    return;
  }

  box.hidden = false;
  box._places = places;
  box.innerHTML = places
    .map(
      (place, index) => `
        <button class="suggestion-button" type="button" data-place="${index}">
          <strong>${place.neighborhood || place.label.split(",")[0]}</strong>
          <span>${place.label}</span>
        </button>
      `
    )
    .join("");
}

async function updateSuggestions(input, box, timerName) {
  const query = input.value.trim();
  if (query.length < 2) {
    box.hidden = true;
    box._places = [];
    return;
  }

  const local = localAddressMatches(query);
  renderSuggestionBox(box, local, "Procurando no mapa...");

  clearTimeout(timerName === "search" ? searchTimer : signupTimer);
  const timeout = setTimeout(async () => {
    try {
      const remote = await fetchAddressSuggestions(query);
      const merged = [...remote, ...local].filter(
        (place, index, all) => all.findIndex((item) => item.label === place.label) === index
      );
      renderSuggestionBox(box, merged.slice(0, 6), "Nenhum endereço encontrado");
    } catch (error) {
      renderSuggestionBox(box, local, "Sugestões online indisponíveis");
    }
  }, 300);

  if (timerName === "search") searchTimer = timeout;
  if (timerName === "signup") signupTimer = timeout;
}

function chooseSuggestion(box, index, target) {
  const place = box._places?.[index];
  if (!place) return;

  if (target === "search") {
    selectedSearchLocation = place;
    addressFilter.value = place.label;
    box.hidden = true;
    renderLocationPreview();
    renderAll();
    return;
  }

  selectedSignupLocation = place;
  workerAddressInput.value = place.label;
  document.querySelector("#neighborhoodInput").value = place.neighborhood || "";
  document.querySelector("#cityInput").value = place.city || "";
  box.hidden = true;
}

document.querySelector("#searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  activeService = serviceFilter.value;
  renderAll();
  document.querySelector("#profissionais").scrollIntoView({ behavior: "smooth" });
});

document.querySelector("#clearFilters").addEventListener("click", () => {
  activeService = "";
  selectedSearchLocation = null;
  serviceFilter.value = "";
  addressFilter.value = "";
  addressSuggestions.hidden = true;
  radiusFilter.value = "5";
  renderLocationPreview();
  renderAll();
});

addressFilter.addEventListener("input", () => {
  selectedSearchLocation = null;
  renderLocationPreview();
  updateSuggestions(addressFilter, addressSuggestions, "search");
});

workerAddressInput.addEventListener("input", () => {
  selectedSignupLocation = null;
  updateSuggestions(workerAddressInput, workerAddressSuggestions, "signup");
});

addressSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-place]");
  if (!button) return;
  chooseSuggestion(addressSuggestions, Number(button.dataset.place), "search");
});

workerAddressSuggestions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-place]");
  if (!button) return;
  chooseSuggestion(workerAddressSuggestions, Number(button.dataset.place), "signup");
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".address-field")) {
    addressSuggestions.hidden = true;
    workerAddressSuggestions.hidden = true;
  }
});

document.querySelector("#aiButton").addEventListener("click", () => {
  const bioInput = document.querySelector("#bioInput");
  const service = serviceInput.value || "serviços";
  const neighborhood = document.querySelector("#neighborhoodInput").value || "sua região";
  if (!bioInput.value.trim()) {
    bioInput.focus();
    return;
  }
  bioInput.value = enhanceBio(bioInput.value, service, neighborhood);
});

document.querySelector("#workerForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const neighborhood = document.querySelector("#neighborhoodInput").value.trim();
  const city = document.querySelector("#cityInput").value.trim();
  const fallbackLocation =
    sampleLocations.find((place) => normalize(place.neighborhood) === normalize(neighborhood)) || sampleLocations[0];
  const location = selectedSignupLocation || fallbackLocation;

  const worker = {
    id: `custom-${Date.now()}`,
    name: document.querySelector("#nameInput").value.trim(),
    phone: `55${document.querySelector("#phoneInput").value.replace(/\D/g, "")}`,
    service: serviceInput.value,
    neighborhood,
    city,
    address: workerAddressInput.value.trim() || `${neighborhood}, ${city}`,
    lat: location.lat + (Math.random() - 0.5) * 0.004,
    lon: location.lon + (Math.random() - 0.5) * 0.004,
    price: document.querySelector("#priceInput").value.trim(),
    rating: "Novo",
    plan: document.querySelector("#featuredInput").checked ? "featured" : "free",
    availability: "A combinar",
    photo: "https://randomuser.me/api/portraits/women/8.jpg",
    description: document.querySelector("#bioInput").value.trim(),
    review: "Perfil novo criado para teste no Empregaê.",
  };

  workers = [worker, ...workers];
  saveWorkers();
  selectedSearchLocation = { label: worker.address, lat: worker.lat, lon: worker.lon };
  addressFilter.value = worker.address;
  activeService = worker.service;
  serviceFilter.value = worker.service;
  form.reset();
  selectedSignupLocation = null;
  renderLocationPreview();
  renderAll();
  document.querySelector("#profissionais").scrollIntoView({ behavior: "smooth" });
});

workersGrid.addEventListener("click", (event) => {
  const profileButton = event.target.closest("[data-profile]");
  const bookButton = event.target.closest("[data-book]");
  if (profileButton) openProfile(profileButton.dataset.profile);
  if (bookButton) openSmartBooking(bookButton.dataset.book);
});

profileContent.addEventListener("click", (event) => {
  const upgradeButton = event.target.closest("[data-upgrade]");
  const bookButton = event.target.closest("[data-book]");
  if (upgradeButton) openFeaturedPlan(upgradeButton.dataset.upgrade);
  if (bookButton) openSmartBooking(bookButton.dataset.book);
});

document.querySelector("#closeModal").addEventListener("click", () => profileModal.close());
profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) profileModal.close();
});

populateServices();
renderAll();

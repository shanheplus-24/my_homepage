import { registerAstroComponent } from '@cloudcannon/editable-regions/astro';
import NewsList from '@components/NewsList.astro';
import PublicationCard from '@components/PublicationCard.astro';
import ResearchCard from '@components/ResearchCard.astro';
import SectionHeading from '@components/SectionHeading.astro';

registerAstroComponent('news_list', NewsList);
registerAstroComponent('publication_card', PublicationCard);
registerAstroComponent('research_card', ResearchCard);
registerAstroComponent('section_heading', SectionHeading);

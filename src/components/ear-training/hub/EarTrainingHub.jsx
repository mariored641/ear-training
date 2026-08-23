import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CategoryCard from '../../common/CategoryCard';
import {
  QuarterNoteIcon,
  PianoOctaveIcon,
  HubRomanIcon,
  VoicesCrossIcon,
  SingerStaffIcon,
  GuitarPickIcon,
  BoltAuraIcon,
} from '../../icons/AppIcons';
import './EarTrainingHub.css';

const EarTrainingHub = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const subCategories = [
    {
      id: 'melodic',
      icon: <QuarterNoteIcon />,
      titleKey: 'categories.melodic',
      descriptionKey: 'earTraining.descriptions.melodic',
      numExercises: 3,
      route: '/category/ear-training/melodic'
    },
    {
      id: 'harmonic-isolated',
      icon: <PianoOctaveIcon />,
      titleKey: 'categories.harmonicIsolated',
      descriptionKey: 'earTraining.descriptions.harmonicIsolated',
      numExercises: 4,
      route: '/category/ear-training/harmonic-isolated'
    },
    {
      id: 'functional',
      icon: <HubRomanIcon />,
      titleKey: 'categories.functional',
      descriptionKey: 'earTraining.descriptions.functional',
      numExercises: 5,
      route: '/category/ear-training/functional'
    },
    {
      id: 'voice-leading',
      icon: <VoicesCrossIcon />,
      titleKey: 'categories.voiceLeading',
      descriptionKey: 'earTraining.descriptions.voiceLeading',
      numExercises: 2,
      route: '/category/ear-training/voice-leading'
    },
    {
      id: 'solfege',
      icon: <SingerStaffIcon />,
      titleKey: 'categories.solfege',
      descriptionKey: 'earTraining.descriptions.solfege',
      numExercises: 2,
      route: '/category/ear-training/solfege'
    },
    {
      id: 'guitar',
      icon: <GuitarPickIcon />,
      titleKey: 'categories.guitar',
      descriptionKey: 'earTraining.descriptions.guitar',
      numExercises: 1,
      route: '/category/ear-training/guitar'
    },
    {
      id: 'reactive',
      icon: <BoltAuraIcon />,
      titleKey: 'categories.reactive',
      descriptionKey: 'earTraining.descriptions.reactive',
      numExercises: 2,
      route: '/category/ear-training/reactive'
    }
  ];

  const handleBackToHome = () => navigate('/');

  return (
    <div className="et-hub-page">
      <header className="et-hub-header">
        <button onClick={handleBackToHome} className="et-hub-back-btn">
          {t('common.backHome')}
        </button>
        <div className="et-hub-title-block">
          <h1 className="et-hub-title">{t('categories.earTraining')}</h1>
          <p className="et-hub-subtitle">{t('earTraining.hubSubtitle')}</p>
        </div>
      </header>

      <div className="et-hub-grid">
        {subCategories.map(cat => (
          <CategoryCard
            key={cat.id}
            categoryId={cat.id}
            icon={cat.icon}
            title={t(cat.titleKey)}
            description={t(cat.descriptionKey)}
            numExercises={cat.numExercises}
            onEnter={() => navigate(cat.route)}
          />
        ))}
      </div>
    </div>
  );
};

export default EarTrainingHub;

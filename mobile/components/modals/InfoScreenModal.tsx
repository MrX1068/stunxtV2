import React from 'react';
import { Modal, ModalBackdrop, ModalContent } from '../ui/modal';
import { CommunityInfoScreen } from '../details/CommunityInfoScreen';
import { SpaceInfoScreen } from '../details/SpaceInfoScreen';
import { Community } from '../../stores/community';
import { Space } from '../../stores/posts';

// Flexible space type that can handle both Space and custom space objects
type FlexibleSpace = Space | {
  id: string;
  name: string;
  interactionType: string;
  description?: string;
  memberCount: number;
  isJoined: boolean;
  communityId: string;
  memberRole?: string;
  type?: string;
  createdAt?: string;
  avatarUrl?: string;
  joinedAt?: string;
};

interface InfoScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'community' | 'space';
  community?: Community;
  space?: FlexibleSpace;
  communityId?: string;
}

export function InfoScreenModal({
  isOpen,
  onClose,
  type,
  community,
  space,
  communityId,
}: InfoScreenModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent className="w-full h-full max-w-none max-h-none m-0 rounded-none">
        {type === 'community' && community ? (
          <CommunityInfoScreen community={community} onClose={onClose} />
        ) : type === 'space' && space && communityId ? (
          <SpaceInfoScreen space={space} communityId={communityId} onClose={onClose} />
        ) : null}
      </ModalContent>
    </Modal>
  );
}

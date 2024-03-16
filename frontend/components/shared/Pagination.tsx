import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants';

interface Props {
  pageNumber: number;
  isNext: boolean;
}

const Pagination = ({ pageNumber, isNext }: Props) => {

  const handleNavigation = (type: string) => {
    let nextPageNumber = pageNumber;

    if (type === 'prev') {
      nextPageNumber = Math.max(1, pageNumber - 1);
    } else if (type === 'next') {
      nextPageNumber = pageNumber + 1;
    }

    if (nextPageNumber > 1) {
        router.setParams({ pageNumber: `${nextPageNumber}` });
    } else {
        router.setParams({ pageNumber: `1` });
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={() => handleNavigation('prev')}
        disabled={pageNumber === 1}
        style={{ backgroundColor: Colors.primary, padding: 10, margin: 5 , borderRadius: 8, opacity: pageNumber === 1 ? 0.2 : 1}}
      >
         <Text style={{ color: 'white' }}>Prev</Text>
      </TouchableOpacity>
      <Text style={{ marginHorizontal: 10 }}>{`${pageNumber}`}</Text>
      <TouchableOpacity
        onPress={() => handleNavigation('next')}
        disabled={!isNext}
        style={{ backgroundColor: 'blue', padding: 10, margin: 5, borderRadius: 8 , opacity: isNext ? 1 : 0.2}}
      >
        <Text style={{ color: 'white' }}>Next</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Pagination;

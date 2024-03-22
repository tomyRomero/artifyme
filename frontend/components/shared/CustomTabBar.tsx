import React from 'react'
import { StatusBar } from 'expo-status-bar';
import { BottomTabBar } from "@react-navigation/bottom-tabs"
import { Colors } from '../../lib/constants';
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";

interface CustomTabBarProps {
  props: BottomTabBarProps;
}

const CustomTabBar = (props: CustomTabBarProps) => {
  return (
    <>
    <StatusBar style="light" backgroundColor={Colors.primary} />
    <BottomTabBar {...props.props} />
    </>
  )
}

export default CustomTabBar
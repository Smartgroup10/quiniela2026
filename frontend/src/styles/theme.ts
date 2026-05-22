import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

export const smartgroupTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#E63946',
    colorLink: '#457B9D',
    colorSuccess: '#2DC653',
    colorWarning: '#F4A261',
    colorError: '#E63946',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    borderRadius: 8,
    colorBgLayout: '#0A0A0A',
    colorBgContainer: '#1A1A1A',
    colorBgElevated: '#1A1A1A',
    colorBorder: '#2D2D2D',
    colorBorderSecondary: '#2D2D2D',
    colorText: '#F1FAEE',
    colorTextSecondary: '#A8A8A8',
    colorTextTertiary: '#A8A8A8',
    colorBgSpotlight: '#2D2D2D',
  },
  components: {
    Button: {
      colorPrimary: '#E63946',
      algorithm: true,
    },
    Menu: {
      darkItemBg: '#111111',
      darkItemSelectedBg: '#E63946',
      darkItemSelectedColor: '#FFFFFF',
      darkItemColor: '#A8A8A8',
      darkItemHoverColor: '#F1FAEE',
      darkItemHoverBg: '#2D2D2D',
    },
    Card: {
      colorBgContainer: '#1A1A1A',
      colorBorderSecondary: '#2D2D2D',
    },
    Table: {
      colorBgContainer: '#1A1A1A',
      headerBg: '#111111',
      rowHoverBg: '#2D2D2D',
      borderColor: '#2D2D2D',
    },
    Input: {
      colorBgContainer: '#111111',
      colorBorder: '#2D2D2D',
      activeBorderColor: '#E63946',
    },
    Select: {
      colorBgContainer: '#111111',
      colorBorder: '#2D2D2D',
      optionSelectedBg: '#2D2D2D',
    },
    Descriptions: {
      colorSplit: '#2D2D2D',
      labelBg: '#111111',
    },
    Progress: {
      defaultColor: '#E63946',
    },
  },
};

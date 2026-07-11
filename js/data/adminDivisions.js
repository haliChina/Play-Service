/**
 * 中国省→市→区/县三级行政区划数据（含经纬度坐标）
 *
 * 数据范围：
 *  - 全部 34 个省级行政区（23省、5自治区、4直辖市、2特别行政区）
 *  - 全部地级市/州/盟（约 330 个）
 *  - 完整区/县数据：4个直辖市全部区县、所有省会城市市辖区、
 *    以及深圳、苏州、无锡、宁波、厦门、青岛、大连、洛阳、桂林、三亚、丽江等热门旅游城市
 *  - 其他城市 districts 为空数组
 *
 * 坐标来源：真实经纬度（WGS84），取各区/县政府所在地或区域中心坐标
 */

export const adminDivisions = {
  // ==================== 直辖市 ====================
  '北京市': {
    type: '直辖市',
    lat: 39.9042, lng: 116.4074,
    cities: [{
      name: '北京市',
      lat: 39.9042, lng: 116.4074,
      districts: [
        { name: '东城区', lat: 39.9289, lng: 116.4170 },
        { name: '西城区', lat: 39.9153, lng: 116.3660 },
        { name: '朝阳区', lat: 39.9218, lng: 116.4434 },
        { name: '丰台区', lat: 39.8585, lng: 116.2868 },
        { name: '石景山区', lat: 39.9054, lng: 116.2229 },
        { name: '海淀区', lat: 39.9593, lng: 116.2983 },
        { name: '门头沟区', lat: 39.9405, lng: 116.1020 },
        { name: '房山区', lat: 39.7479, lng: 116.1427 },
        { name: '通州区', lat: 39.9096, lng: 116.6566 },
        { name: '顺义区', lat: 40.1289, lng: 116.6535 },
        { name: '昌平区', lat: 40.2206, lng: 116.2312 },
        { name: '大兴区', lat: 39.7268, lng: 116.3416 },
        { name: '怀柔区', lat: 40.3155, lng: 116.6312 },
        { name: '平谷区', lat: 40.1406, lng: 117.1122 },
        { name: '密云区', lat: 40.3772, lng: 116.8432 },
        { name: '延庆区', lat: 40.4653, lng: 115.9748 }
      ]
    }]
  },

  '天津市': {
    type: '直辖市',
    lat: 39.0842, lng: 117.2009,
    cities: [{
      name: '天津市',
      lat: 39.0842, lng: 117.2009,
      districts: [
        { name: '和平区', lat: 39.1171, lng: 117.2146 },
        { name: '河东区', lat: 39.1283, lng: 117.2528 },
        { name: '河西区', lat: 39.0838, lng: 117.2234 },
        { name: '南开区', lat: 39.1382, lng: 117.1502 },
        { name: '河北区', lat: 39.1482, lng: 117.1967 },
        { name: '红桥区', lat: 39.1673, lng: 117.1516 },
        { name: '东丽区', lat: 39.0868, lng: 117.3135 },
        { name: '西青区', lat: 39.1411, lng: 117.0123 },
        { name: '津南区', lat: 38.9385, lng: 117.3574 },
        { name: '北辰区', lat: 39.2250, lng: 117.1353 },
        { name: '武清区', lat: 39.3842, lng: 117.0444 },
        { name: '宝坻区', lat: 39.7056, lng: 117.3099 },
        { name: '滨海新区', lat: 39.0031, lng: 117.7142 },
        { name: '宁河区', lat: 39.3292, lng: 117.8267 },
        { name: '静海区', lat: 38.9474, lng: 116.9743 },
        { name: '蓟州区', lat: 40.0457, lng: 117.4083 }
      ]
    }]
  },

  '上海市': {
    type: '直辖市',
    lat: 31.2304, lng: 121.4737,
    cities: [{
      name: '上海市',
      lat: 31.2304, lng: 121.4737,
      districts: [
        { name: '黄浦区', lat: 31.2316, lng: 121.4926 },
        { name: '徐汇区', lat: 31.1844, lng: 121.4366 },
        { name: '长宁区', lat: 31.2204, lng: 121.4244 },
        { name: '静安区', lat: 31.2283, lng: 121.4480 },
        { name: '普陀区', lat: 31.2470, lng: 121.3972 },
        { name: '虹口区', lat: 31.2645, lng: 121.4913 },
        { name: '杨浦区', lat: 31.2700, lng: 121.5256 },
        { name: '闵行区', lat: 31.1128, lng: 121.3818 },
        { name: '宝山区', lat: 31.4045, lng: 121.4891 },
        { name: '嘉定区', lat: 31.3755, lng: 121.2655 },
        { name: '浦东新区', lat: 31.2216, lng: 121.5444 },
        { name: '金山区', lat: 30.7419, lng: 121.3424 },
        { name: '松江区', lat: 31.0322, lng: 121.2277 },
        { name: '青浦区', lat: 31.1496, lng: 121.1242 },
        { name: '奉贤区', lat: 30.9182, lng: 121.4741 },
        { name: '崇明区', lat: 31.6229, lng: 121.3944 }
      ]
    }]
  },

  '重庆市': {
    type: '直辖市',
    lat: 29.5630, lng: 106.5516,
    cities: [{
      name: '重庆市',
      lat: 29.5630, lng: 106.5516,
      districts: [
        { name: '渝中区', lat: 29.5533, lng: 106.5690 },
        { name: '万州区', lat: 30.8078, lng: 108.4086 },
        { name: '涪陵区', lat: 29.7036, lng: 107.3893 },
        { name: '大渡口区', lat: 29.4847, lng: 106.4827 },
        { name: '江北区', lat: 29.6066, lng: 106.5779 },
        { name: '沙坪坝区', lat: 29.5410, lng: 106.4542 },
        { name: '九龙坡区', lat: 29.5022, lng: 106.5109 },
        { name: '南岸区', lat: 29.5263, lng: 106.5689 },
        { name: '北碚区', lat: 29.8043, lng: 106.4367 },
        { name: '綦江区', lat: 29.0291, lng: 106.6514 },
        { name: '渝北区', lat: 29.7182, lng: 106.6313 },
        { name: '巴南区', lat: 29.3820, lng: 106.5233 },
        { name: '黔江区', lat: 29.5333, lng: 108.7709 },
        { name: '长寿区', lat: 29.8576, lng: 107.0813 },
        { name: '江津区', lat: 29.2900, lng: 106.2593 },
        { name: '合川区', lat: 29.9722, lng: 106.2761 },
        { name: '永川区', lat: 29.3559, lng: 105.9275 },
        { name: '南川区', lat: 29.1576, lng: 107.0992 },
        { name: '璧山区', lat: 29.5921, lng: 106.2280 },
        { name: '铜梁区', lat: 29.8448, lng: 106.0563 },
        { name: '潼南区', lat: 30.1906, lng: 105.8414 },
        { name: '荣昌区', lat: 29.4036, lng: 105.5945 },
        { name: '大足区', lat: 29.7066, lng: 105.7217 },
        { name: '开州区', lat: 31.1676, lng: 108.3931 },
        { name: '梁平区', lat: 30.6804, lng: 107.7835 },
        { name: '武隆区', lat: 29.3220, lng: 107.7597 },
        { name: '城口县', lat: 31.9477, lng: 108.6642 },
        { name: '丰都县', lat: 29.8635, lng: 107.7308 },
        { name: '垫江县', lat: 30.3277, lng: 107.3348 },
        { name: '忠县', lat: 30.3000, lng: 108.0390 },
        { name: '云阳县', lat: 30.9305, lng: 108.6976 },
        { name: '奉节县', lat: 31.0185, lng: 109.4640 },
        { name: '巫山县', lat: 31.0749, lng: 109.8789 },
        { name: '巫溪县', lat: 31.3986, lng: 109.5701 },
        { name: '石柱土家族自治县', lat: 29.9985, lng: 108.1139 },
        { name: '秀山土家族苗族自治县', lat: 28.4503, lng: 108.9886 },
        { name: '酉阳土家族苗族自治县', lat: 28.8445, lng: 108.7672 },
        { name: '彭水苗族土家族自治县', lat: 29.2936, lng: 108.1655 }
      ]
    }]
  },

  // ==================== 华北地区 ====================
  '河北省': {
    type: '省',
    lat: 38.0428, lng: 114.5149,
    cities: [
      {
        name: '石家庄市', lat: 38.0428, lng: 114.5149,
        districts: [
          { name: '长安区', lat: 38.0494, lng: 114.5390 },
          { name: '桥西区', lat: 38.0206, lng: 114.4613 },
          { name: '新华区', lat: 38.0511, lng: 114.4633 },
          { name: '井陉矿区', lat: 38.0668, lng: 114.0584 },
          { name: '裕华区', lat: 38.0813, lng: 114.5311 },
          { name: '藁城区', lat: 38.0215, lng: 114.8476 },
          { name: '鹿泉区', lat: 38.0859, lng: 114.3135 },
          { name: '栾城区', lat: 37.9002, lng: 114.6486 },
          { name: '井陉县', lat: 38.0336, lng: 114.1448 },
          { name: '正定县', lat: 38.1464, lng: 114.5729 },
          { name: '行唐县', lat: 38.4374, lng: 114.5526 },
          { name: '灵寿县', lat: 38.3085, lng: 114.3826 },
          { name: '高邑县', lat: 37.6156, lng: 114.6117 },
          { name: '深泽县', lat: 38.1838, lng: 115.2006 },
          { name: '赞皇县', lat: 37.6657, lng: 114.3862 },
          { name: '无极县', lat: 38.1782, lng: 114.9769 },
          { name: '平山县', lat: 38.2595, lng: 114.1862 },
          { name: '元氏县', lat: 37.7665, lng: 114.5255 },
          { name: '赵县', lat: 37.7563, lng: 114.7762 },
          { name: '晋州市', lat: 38.0335, lng: 115.0441 },
          { name: '新乐市', lat: 38.3437, lng: 114.6838 }
        ]
      },
      { name: '唐山市', lat: 39.6306, lng: 118.1804, districts: [] },
      { name: '秦皇岛市', lat: 39.9354, lng: 119.6005, districts: [] },
      { name: '邯郸市', lat: 36.6253, lng: 114.5391, districts: [] },
      { name: '邢台市', lat: 37.0709, lng: 114.5046, districts: [] },
      { name: '保定市', lat: 38.8740, lng: 115.4646, districts: [] },
      { name: '张家口市', lat: 40.7686, lng: 114.8869, districts: [] },
      { name: '承德市', lat: 40.9515, lng: 117.9626, districts: [] },
      { name: '沧州市', lat: 38.3104, lng: 116.8388, districts: [] },
      { name: '廊坊市', lat: 39.5377, lng: 116.6833, districts: [] },
      { name: '衡水市', lat: 37.7339, lng: 115.6658, districts: [] }
    ]
  },

  '山西省': {
    type: '省',
    lat: 37.8706, lng: 112.5489,
    cities: [
      {
        name: '太原市', lat: 37.8706, lng: 112.5489,
        districts: [
          { name: '小店区', lat: 37.7358, lng: 112.5657 },
          { name: '迎泽区', lat: 37.8544, lng: 112.5634 },
          { name: '杏花岭区', lat: 37.8941, lng: 112.5606 },
          { name: '尖草坪区', lat: 37.9385, lng: 112.4873 },
          { name: '万柏林区', lat: 37.8592, lng: 112.5158 },
          { name: '晋源区', lat: 37.7242, lng: 112.4773 },
          { name: '清徐县', lat: 37.6076, lng: 112.3587 },
          { name: '阳曲县', lat: 38.0583, lng: 112.6739 },
          { name: '娄烦县', lat: 38.0672, lng: 111.7972 },
          { name: '古交市', lat: 37.9068, lng: 112.1787 }
        ]
      },
      { name: '大同市', lat: 40.0768, lng: 113.3001, districts: [] },
      { name: '阳泉市', lat: 37.8576, lng: 113.5760, districts: [] },
      { name: '长治市', lat: 36.1953, lng: 113.1163, districts: [] },
      { name: '晋城市', lat: 35.4905, lng: 112.8513, districts: [] },
      { name: '朔州市', lat: 39.3315, lng: 112.4329, districts: [] },
      { name: '晋中市', lat: 37.6877, lng: 112.7528, districts: [] },
      { name: '运城市', lat: 35.0226, lng: 111.0070, districts: [] },
      { name: '忻州市', lat: 38.4163, lng: 112.7339, districts: [] },
      { name: '临汾市', lat: 36.0880, lng: 111.5190, districts: [] },
      { name: '吕梁市', lat: 37.5181, lng: 111.1448, districts: [] }
    ]
  },

  '内蒙古自治区': {
    type: '自治区',
    lat: 40.8426, lng: 111.7490,
    cities: [
      {
        name: '呼和浩特市', lat: 40.8426, lng: 111.7490,
        districts: [
          { name: '新城区', lat: 40.8423, lng: 111.7490 },
          { name: '回民区', lat: 40.8044, lng: 111.6240 },
          { name: '玉泉区', lat: 40.7530, lng: 111.7050 },
          { name: '赛罕区', lat: 40.7990, lng: 111.8660 },
          { name: '土默特左旗', lat: 40.7190, lng: 111.1650 },
          { name: '托克托县', lat: 40.2750, lng: 111.1850 },
          { name: '和林格尔县', lat: 40.3780, lng: 111.8220 },
          { name: '清水河县', lat: 39.9090, lng: 111.6830 },
          { name: '武川县', lat: 41.0950, lng: 111.4510 }
        ]
      },
      { name: '包头市', lat: 40.6574, lng: 109.8403, districts: [] },
      { name: '乌海市', lat: 39.6532, lng: 106.7943, districts: [] },
      { name: '赤峰市', lat: 42.2576, lng: 118.8892, districts: [] },
      { name: '通辽市', lat: 43.6527, lng: 122.2440, districts: [] },
      { name: '鄂尔多斯市', lat: 39.6087, lng: 109.7814, districts: [] },
      { name: '呼伦贝尔市', lat: 49.2122, lng: 119.7659, districts: [] },
      { name: '巴彦淖尔市', lat: 40.7433, lng: 107.3880, districts: [] },
      { name: '乌兰察布市', lat: 41.0340, lng: 113.1330, districts: [] },
      { name: '兴安盟', lat: 46.0763, lng: 122.0700, districts: [] },
      { name: '锡林郭勒盟', lat: 43.9333, lng: 116.0500, districts: [] },
      { name: '阿拉善盟', lat: 38.8440, lng: 105.7289, districts: [] }
    ]
  },

  // ==================== 东北地区 ====================
  '辽宁省': {
    type: '省',
    lat: 41.8057, lng: 123.4315,
    cities: [
      {
        name: '沈阳市', lat: 41.8057, lng: 123.4315,
        districts: [
          { name: '和平区', lat: 41.7896, lng: 123.4205 },
          { name: '沈河区', lat: 41.7956, lng: 123.4585 },
          { name: '大东区', lat: 41.8055, lng: 123.4692 },
          { name: '皇姑区', lat: 41.8246, lng: 123.4254 },
          { name: '铁西区', lat: 41.8026, lng: 123.3765 },
          { name: '苏家屯区', lat: 41.6647, lng: 123.3441 },
          { name: '浑南区', lat: 41.7145, lng: 123.4493 },
          { name: '沈北新区', lat: 41.9134, lng: 123.5262 },
          { name: '于洪区', lat: 41.7938, lng: 123.3080 },
          { name: '辽中区', lat: 41.5145, lng: 122.7656 },
          { name: '康平县', lat: 42.7506, lng: 123.3537 },
          { name: '法库县', lat: 42.5046, lng: 123.4121 },
          { name: '新民市', lat: 41.9985, lng: 122.8288 }
        ]
      },
      {
        name: '大连市', lat: 38.9140, lng: 121.6147,
        districts: [
          { name: '中山区', lat: 38.9186, lng: 121.6449 },
          { name: '西岗区', lat: 38.9147, lng: 121.6123 },
          { name: '沙河口区', lat: 38.9050, lng: 121.5800 },
          { name: '甘井子区', lat: 38.9526, lng: 121.5260 },
          { name: '旅顺口区', lat: 38.8512, lng: 121.2620 },
          { name: '金州区', lat: 39.0500, lng: 121.7180 },
          { name: '普兰店区', lat: 39.3946, lng: 121.9632 },
          { name: '长海县', lat: 39.2726, lng: 122.5885 },
          { name: '瓦房店市', lat: 39.6246, lng: 121.9810 },
          { name: '庄河市', lat: 39.6806, lng: 122.9673 }
        ]
      },
      { name: '鞍山市', lat: 41.1100, lng: 122.9942, districts: [] },
      { name: '抚顺市', lat: 41.8807, lng: 123.9572, districts: [] },
      { name: '本溪市', lat: 41.2945, lng: 123.7659, districts: [] },
      { name: '丹东市', lat: 40.1295, lng: 124.3936, districts: [] },
      { name: '锦州市', lat: 41.0954, lng: 121.1268, districts: [] },
      { name: '营口市', lat: 40.6675, lng: 122.2349, districts: [] },
      { name: '阜新市', lat: 42.0218, lng: 121.6700, districts: [] },
      { name: '辽阳市', lat: 41.2693, lng: 123.1738, districts: [] },
      { name: '盘锦市', lat: 41.1245, lng: 122.0698, districts: [] },
      { name: '铁岭市', lat: 42.2997, lng: 123.8443, districts: [] },
      { name: '朝阳市', lat: 41.5735, lng: 120.4509, districts: [] },
      { name: '葫芦岛市', lat: 40.7110, lng: 120.8362, districts: [] }
    ]
  },

  '吉林省': {
    type: '省',
    lat: 43.8868, lng: 125.3245,
    cities: [
      {
        name: '长春市', lat: 43.8868, lng: 125.3245,
        districts: [
          { name: '南关区', lat: 43.8640, lng: 125.3500 },
          { name: '宽城区', lat: 43.9065, lng: 125.3260 },
          { name: '朝阳区', lat: 43.8335, lng: 125.2880 },
          { name: '二道区', lat: 43.8680, lng: 125.3740 },
          { name: '绿园区', lat: 43.8800, lng: 125.2640 },
          { name: '双阳区', lat: 43.6580, lng: 125.6650 },
          { name: '九台区', lat: 44.1516, lng: 125.8395 },
          { name: '农安县', lat: 44.4324, lng: 125.1848 },
          { name: '榆树市', lat: 44.8392, lng: 126.5330 },
          { name: '德惠市', lat: 44.5370, lng: 125.7056 }
        ]
      },
      { name: '吉林市', lat: 43.8378, lng: 126.5500, districts: [] },
      { name: '四平市', lat: 43.1664, lng: 124.3506, districts: [] },
      { name: '辽源市', lat: 42.8877, lng: 125.1452, districts: [] },
      { name: '通化市', lat: 41.7211, lng: 125.9398, districts: [] },
      { name: '白山市', lat: 41.9385, lng: 126.4276, districts: [] },
      { name: '松原市', lat: 45.1411, lng: 124.8259, districts: [] },
      { name: '白城市', lat: 45.6196, lng: 122.8388, districts: [] },
      { name: '延边朝鲜族自治州', lat: 42.8917, lng: 129.5097, districts: [] }
    ]
  },

  '黑龙江省': {
    type: '省',
    lat: 45.8038, lng: 126.5340,
    cities: [
      {
        name: '哈尔滨市', lat: 45.8038, lng: 126.5340,
        districts: [
          { name: '道里区', lat: 45.7531, lng: 126.6162 },
          { name: '南岗区', lat: 45.7598, lng: 126.6692 },
          { name: '道外区', lat: 45.7846, lng: 126.6489 },
          { name: '平房区', lat: 45.5976, lng: 126.6376 },
          { name: '松北区', lat: 45.8023, lng: 126.5693 },
          { name: '香坊区', lat: 45.7077, lng: 126.6676 },
          { name: '呼兰区', lat: 45.8882, lng: 126.5839 },
          { name: '阿城区', lat: 45.5410, lng: 126.9580 },
          { name: '双城区', lat: 45.3530, lng: 126.2850 },
          { name: '依兰县', lat: 46.3245, lng: 129.5675 },
          { name: '方正县', lat: 45.8510, lng: 128.8294 },
          { name: '宾县', lat: 45.7550, lng: 127.4860 },
          { name: '巴彦县', lat: 46.0810, lng: 127.4030 },
          { name: '木兰县', lat: 45.9430, lng: 128.0430 },
          { name: '通河县', lat: 45.9900, lng: 128.7490 },
          { name: '延寿县', lat: 45.4510, lng: 128.3310 },
          { name: '尚志市', lat: 45.2170, lng: 127.9610 },
          { name: '五常市', lat: 44.9320, lng: 127.1500 }
        ]
      },
      { name: '齐齐哈尔市', lat: 47.3543, lng: 123.9182, districts: [] },
      { name: '鸡西市', lat: 45.2952, lng: 130.9694, districts: [] },
      { name: '鹤岗市', lat: 47.3322, lng: 130.2776, districts: [] },
      { name: '双鸭山市', lat: 46.6464, lng: 131.1591, districts: [] },
      { name: '大庆市', lat: 46.5907, lng: 125.1037, districts: [] },
      { name: '伊春市', lat: 47.7345, lng: 128.8993, districts: [] },
      { name: '佳木斯市', lat: 46.7996, lng: 130.3180, districts: [] },
      { name: '七台河市', lat: 45.7713, lng: 131.0031, districts: [] },
      { name: '牡丹江市', lat: 44.5527, lng: 129.6329, districts: [] },
      { name: '黑河市', lat: 50.2456, lng: 127.5285, districts: [] },
      { name: '绥化市', lat: 46.6374, lng: 126.9689, districts: [] },
      { name: '大兴安岭地区', lat: 52.3353, lng: 124.7110, districts: [] }
    ]
  },

  // ==================== 华东地区 ====================
  '江苏省': {
    type: '省',
    lat: 32.0603, lng: 118.7969,
    cities: [
      {
        name: '南京市', lat: 32.0603, lng: 118.7969,
        districts: [
          { name: '玄武区', lat: 32.0486, lng: 118.7979 },
          { name: '秦淮区', lat: 32.0211, lng: 118.7861 },
          { name: '建邺区', lat: 32.0030, lng: 118.7317 },
          { name: '鼓楼区', lat: 32.0664, lng: 118.7700 },
          { name: '浦口区', lat: 32.0644, lng: 118.6266 },
          { name: '栖霞区', lat: 32.1032, lng: 118.9087 },
          { name: '雨花台区', lat: 31.9920, lng: 118.7790 },
          { name: '江宁区', lat: 31.9535, lng: 118.8398 },
          { name: '六合区', lat: 32.3400, lng: 118.8414 },
          { name: '溧水区', lat: 31.6512, lng: 119.0287 },
          { name: '高淳区', lat: 31.3275, lng: 118.8922 }
        ]
      },
      {
        name: '苏州市', lat: 31.2989, lng: 120.5853,
        districts: [
          { name: '姑苏区', lat: 31.3116, lng: 120.6199 },
          { name: '虎丘区', lat: 31.3097, lng: 120.5726 },
          { name: '吴中区', lat: 31.2629, lng: 120.6314 },
          { name: '相城区', lat: 31.3689, lng: 120.6425 },
          { name: '吴江区', lat: 30.9016, lng: 120.6450 },
          { name: '工业园区', lat: 31.3126, lng: 120.7426 },
          { name: '常熟市', lat: 31.6464, lng: 120.7525 },
          { name: '张家港市', lat: 31.8754, lng: 120.5557 },
          { name: '昆山市', lat: 31.3854, lng: 120.9808 },
          { name: '太仓市', lat: 31.4554, lng: 121.1306 }
        ]
      },
      {
        name: '无锡市', lat: 31.4912, lng: 120.3119,
        districts: [
          { name: '锡山区', lat: 31.5895, lng: 120.3577 },
          { name: '惠山区', lat: 31.6810, lng: 120.2985 },
          { name: '滨湖区', lat: 31.5215, lng: 120.2660 },
          { name: '梁溪区', lat: 31.5606, lng: 120.2963 },
          { name: '新吴区', lat: 31.4906, lng: 120.3530 },
          { name: '江阴市', lat: 31.9206, lng: 120.2853 },
          { name: '宜兴市', lat: 31.3398, lng: 119.8234 }
        ]
      },
      { name: '徐州市', lat: 34.2654, lng: 117.1849, districts: [] },
      { name: '常州市', lat: 31.7727, lng: 119.9469, districts: [] },
      { name: '南通市', lat: 31.9802, lng: 120.8942, districts: [] },
      { name: '连云港市', lat: 34.5969, lng: 119.2216, districts: [] },
      { name: '淮安市', lat: 33.5097, lng: 119.0218, districts: [] },
      { name: '盐城市', lat: 33.3776, lng: 120.1575, districts: [] },
      { name: '扬州市', lat: 32.3946, lng: 119.4127, districts: [] },
      { name: '镇江市', lat: 32.2044, lng: 119.4528, districts: [] },
      { name: '泰州市', lat: 32.4554, lng: 119.9229, districts: [] },
      { name: '宿迁市', lat: 33.9630, lng: 118.2754, districts: [] }
    ]
  },

  '浙江省': {
    type: '省',
    lat: 30.2741, lng: 120.1551,
    cities: [
      {
        name: '杭州市', lat: 30.2741, lng: 120.1551,
        districts: [
          { name: '上城区', lat: 30.2431, lng: 120.1838 },
          { name: '拱墅区', lat: 30.3186, lng: 120.1416 },
          { name: '西湖区', lat: 30.2592, lng: 120.1303 },
          { name: '滨江区', lat: 30.2083, lng: 120.2116 },
          { name: '萧山区', lat: 30.1683, lng: 120.2643 },
          { name: '余杭区', lat: 30.4190, lng: 120.2986 },
          { name: '富阳区', lat: 30.0486, lng: 119.9601 },
          { name: '临安区', lat: 30.2345, lng: 119.7247 },
          { name: '临平区', lat: 30.4190, lng: 120.3000 },
          { name: '钱塘区', lat: 30.3020, lng: 120.3850 },
          { name: '桐庐县', lat: 29.7936, lng: 119.6915 },
          { name: '淳安县', lat: 29.6087, lng: 119.0419 },
          { name: '建德市', lat: 29.4747, lng: 119.2812 }
        ]
      },
      {
        name: '宁波市', lat: 29.8683, lng: 121.5440,
        districts: [
          { name: '海曙区', lat: 29.8322, lng: 121.5505 },
          { name: '江北区', lat: 29.8868, lng: 121.5655 },
          { name: '北仑区', lat: 29.8995, lng: 121.8440 },
          { name: '镇海区', lat: 29.9486, lng: 121.5964 },
          { name: '鄞州区', lat: 29.8165, lng: 121.5466 },
          { name: '奉化区', lat: 29.6551, lng: 121.4067 },
          { name: '象山县', lat: 29.4566, lng: 121.8692 },
          { name: '宁海县', lat: 29.2880, lng: 121.4300 },
          { name: '余姚市', lat: 30.0368, lng: 121.1542 },
          { name: '慈溪市', lat: 30.1697, lng: 121.2664 }
        ]
      },
      { name: '温州市', lat: 27.9938, lng: 120.6991, districts: [] },
      { name: '嘉兴市', lat: 30.7522, lng: 120.7550, districts: [] },
      { name: '湖州市', lat: 30.8949, lng: 120.0867, districts: [] },
      { name: '绍兴市', lat: 30.0303, lng: 120.5848, districts: [] },
      { name: '金华市', lat: 29.0784, lng: 119.6471, districts: [] },
      { name: '衢州市', lat: 28.9358, lng: 118.8595, districts: [] },
      { name: '舟山市', lat: 29.9853, lng: 122.2072, districts: [] },
      { name: '台州市', lat: 28.6562, lng: 121.4209, districts: [] },
      { name: '丽水市', lat: 28.4517, lng: 119.9229, districts: [] }
    ]
  },

  '安徽省': {
    type: '省',
    lat: 31.8206, lng: 117.2272,
    cities: [
      {
        name: '合肥市', lat: 31.8206, lng: 117.2272,
        districts: [
          { name: '瑶海区', lat: 31.8585, lng: 117.3094 },
          { name: '庐阳区', lat: 31.8782, lng: 117.2648 },
          { name: '蜀山区', lat: 31.8512, lng: 117.2603 },
          { name: '包河区', lat: 31.7967, lng: 117.3100 },
          { name: '长丰县', lat: 32.4790, lng: 117.1650 },
          { name: '肥东县', lat: 31.8877, lng: 117.4693 },
          { name: '肥西县', lat: 31.7059, lng: 117.1578 },
          { name: '庐江县', lat: 31.2553, lng: 117.2888 },
          { name: '巢湖市', lat: 31.6004, lng: 117.8676 }
        ]
      },
      { name: '芜湖市', lat: 31.3345, lng: 118.4326, districts: [] },
      { name: '蚌埠市', lat: 32.9166, lng: 117.3894, districts: [] },
      { name: '淮南市', lat: 32.6264, lng: 116.9999, districts: [] },
      { name: '马鞍山市', lat: 31.6706, lng: 118.5070, districts: [] },
      { name: '淮北市', lat: 33.9717, lng: 116.7945, districts: [] },
      { name: '铜陵市', lat: 30.6446, lng: 117.8122, districts: [] },
      { name: '安庆市', lat: 30.5430, lng: 117.0631, districts: [] },
      { name: '黄山市', lat: 29.7147, lng: 118.3375, districts: [] },
      { name: '滁州市', lat: 32.3019, lng: 118.3170, districts: [] },
      { name: '阜阳市', lat: 32.8908, lng: 115.8142, districts: [] },
      { name: '宿州市', lat: 33.6461, lng: 116.9641, districts: [] },
      { name: '六安市', lat: 31.7350, lng: 116.5230, districts: [] },
      { name: '亳州市', lat: 33.8693, lng: 115.7785, districts: [] },
      { name: '池州市', lat: 30.6650, lng: 117.4912, districts: [] },
      { name: '宣城市', lat: 30.9457, lng: 118.7590, districts: [] }
    ]
  },

  '福建省': {
    type: '省',
    lat: 26.0745, lng: 119.2965,
    cities: [
      {
        name: '福州市', lat: 26.0745, lng: 119.2965,
        districts: [
          { name: '鼓楼区', lat: 26.0821, lng: 119.3036 },
          { name: '台江区', lat: 26.0529, lng: 119.3143 },
          { name: '仓山区', lat: 26.0465, lng: 119.3206 },
          { name: '马尾区', lat: 25.9750, lng: 119.4517 },
          { name: '晋安区', lat: 26.0821, lng: 119.3226 },
          { name: '长乐区', lat: 25.9982, lng: 119.6730 },
          { name: '闽侯县', lat: 26.1500, lng: 119.1300 },
          { name: '连江县', lat: 26.1930, lng: 119.5390 },
          { name: '罗源县', lat: 26.4895, lng: 119.5497 },
          { name: '闽清县', lat: 26.2210, lng: 118.8640 },
          { name: '永泰县', lat: 25.9680, lng: 118.7530 },
          { name: '平潭县', lat: 25.5037, lng: 119.7900 },
          { name: '福清市', lat: 25.7200, lng: 119.3850 }
        ]
      },
      {
        name: '厦门市', lat: 24.4798, lng: 118.0894,
        districts: [
          { name: '思明区', lat: 24.4452, lng: 118.0820 },
          { name: '海沧区', lat: 24.4827, lng: 118.0320 },
          { name: '湖里区', lat: 24.5129, lng: 118.1095 },
          { name: '集美区', lat: 24.5759, lng: 118.0972 },
          { name: '同安区', lat: 24.7224, lng: 118.1520 },
          { name: '翔安区', lat: 24.5805, lng: 118.2430 }
        ]
      },
      { name: '莆田市', lat: 25.4309, lng: 119.0078, districts: [] },
      { name: '三明市', lat: 26.2654, lng: 117.6389, districts: [] },
      { name: '泉州市', lat: 24.8741, lng: 118.6757, districts: [] },
      { name: '漳州市', lat: 24.5130, lng: 117.6471, districts: [] },
      { name: '南平市', lat: 26.6435, lng: 118.1780, districts: [] },
      { name: '龙岩市', lat: 25.0755, lng: 117.0173, districts: [] },
      { name: '宁德市', lat: 26.6656, lng: 119.5480, districts: [] }
    ]
  },

  '江西省': {
    type: '省',
    lat: 28.6820, lng: 115.8579,
    cities: [
      {
        name: '南昌市', lat: 28.6820, lng: 115.8579,
        districts: [
          { name: '东湖区', lat: 28.6856, lng: 115.8990 },
          { name: '西湖区', lat: 28.6560, lng: 115.8640 },
          { name: '青云谱区', lat: 28.6210, lng: 115.9250 },
          { name: '青山湖区', lat: 28.6810, lng: 115.9620 },
          { name: '新建区', lat: 28.7300, lng: 115.8150 },
          { name: '红谷滩区', lat: 28.6870, lng: 115.8300 },
          { name: '南昌县', lat: 28.5450, lng: 115.9440 },
          { name: '安义县', lat: 28.8380, lng: 115.5490 },
          { name: '进贤县', lat: 28.3770, lng: 116.2400 }
        ]
      },
      { name: '景德镇市', lat: 29.2687, lng: 117.1784, districts: [] },
      { name: '萍乡市', lat: 27.6229, lng: 113.8544, districts: [] },
      { name: '九江市', lat: 29.7050, lng: 115.9929, districts: [] },
      { name: '新余市', lat: 27.8100, lng: 114.9170, districts: [] },
      { name: '鹰潭市', lat: 28.2602, lng: 117.0694, districts: [] },
      { name: '赣州市', lat: 25.8314, lng: 114.9353, districts: [] },
      { name: '吉安市', lat: 27.1139, lng: 114.9863, districts: [] },
      { name: '宜春市', lat: 27.8043, lng: 114.4162, districts: [] },
      { name: '抚州市', lat: 27.9538, lng: 116.3583, districts: [] },
      { name: '上饶市', lat: 25.4651, lng: 117.9434, districts: [] }
    ]
  },

  '山东省': {
    type: '省',
    lat: 36.6512, lng: 117.1201,
    cities: [
      {
        name: '济南市', lat: 36.6512, lng: 117.1201,
        districts: [
          { name: '历下区', lat: 36.6677, lng: 117.0768 },
          { name: '市中区', lat: 36.6512, lng: 116.9974 },
          { name: '槐荫区', lat: 36.6512, lng: 116.9008 },
          { name: '天桥区', lat: 36.6780, lng: 116.9874 },
          { name: '历城区', lat: 36.6800, lng: 117.0650 },
          { name: '长清区', lat: 36.5530, lng: 116.7520 },
          { name: '章丘区', lat: 36.7120, lng: 117.5260 },
          { name: '济阳区', lat: 36.9780, lng: 117.1730 },
          { name: '莱芜区', lat: 36.2140, lng: 117.6770 },
          { name: '钢城区', lat: 36.0590, lng: 117.8110 },
          { name: '平阴县', lat: 36.2890, lng: 116.4560 },
          { name: '商河县', lat: 37.3090, lng: 117.1570 }
        ]
      },
      {
        name: '青岛市', lat: 36.0671, lng: 120.3826,
        districts: [
          { name: '市南区', lat: 36.0671, lng: 120.3826 },
          { name: '市北区', lat: 36.0862, lng: 120.3743 },
          { name: '黄岛区', lat: 35.9600, lng: 120.1970 },
          { name: '崂山区', lat: 36.1070, lng: 120.4680 },
          { name: '李沧区', lat: 36.1450, lng: 120.4350 },
          { name: '城阳区', lat: 36.3020, lng: 120.3960 },
          { name: '即墨区', lat: 36.3900, lng: 120.4470 },
          { name: '胶州市', lat: 36.2640, lng: 120.0330 },
          { name: '平度市', lat: 36.7870, lng: 119.9600 },
          { name: '莱西市', lat: 36.8890, lng: 120.5170 }
        ]
      },
      { name: '淄博市', lat: 36.8131, lng: 118.0548, districts: [] },
      { name: '枣庄市', lat: 34.8105, lng: 117.3237, districts: [] },
      { name: '东营市', lat: 37.4336, lng: 118.6747, districts: [] },
      { name: '烟台市', lat: 37.4638, lng: 121.4479, districts: [] },
      { name: '潍坊市', lat: 36.7068, lng: 119.1620, districts: [] },
      { name: '济宁市', lat: 35.4145, lng: 116.5873, districts: [] },
      { name: '泰安市', lat: 36.2000, lng: 117.0880, districts: [] },
      { name: '威海市', lat: 37.5128, lng: 122.1200, districts: [] },
      { name: '日照市', lat: 35.4164, lng: 119.5269, districts: [] },
      { name: '临沂市', lat: 35.1045, lng: 118.3564, districts: [] },
      { name: '德州市', lat: 37.4341, lng: 116.3595, districts: [] },
      { name: '聊城市', lat: 36.4558, lng: 115.9855, districts: [] },
      { name: '滨州市', lat: 37.3827, lng: 117.9714, districts: [] },
      { name: '菏泽市', lat: 35.2326, lng: 115.4811, districts: [] }
    ]
  },

  // ==================== 华中地区 ====================
  '河南省': {
    type: '省',
    lat: 34.7466, lng: 113.6253,
    cities: [
      {
        name: '郑州市', lat: 34.7466, lng: 113.6253,
        districts: [
          { name: '中原区', lat: 34.7482, lng: 113.6130 },
          { name: '二七区', lat: 34.7330, lng: 113.6400 },
          { name: '管城回族区', lat: 34.7570, lng: 113.6770 },
          { name: '金水区', lat: 34.7750, lng: 113.6610 },
          { name: '上街区', lat: 34.8030, lng: 113.3080 },
          { name: '惠济区', lat: 34.8670, lng: 113.6230 },
          { name: '中牟县', lat: 34.7190, lng: 113.9760 },
          { name: '巩义市', lat: 34.7490, lng: 113.0220 },
          { name: '荥阳市', lat: 34.7870, lng: 113.3830 },
          { name: '新密市', lat: 34.5390, lng: 113.3900 },
          { name: '新郑市', lat: 34.3960, lng: 113.7410 },
          { name: '登封市', lat: 34.4630, lng: 113.0200 }
        ]
      },
      {
        name: '洛阳市', lat: 34.6197, lng: 112.4540,
        districts: [
          { name: '老城区', lat: 34.6820, lng: 112.4690 },
          { name: '西工区', lat: 34.6630, lng: 112.4280 },
          { name: '瀍河回族区', lat: 34.6800, lng: 112.5000 },
          { name: '涧西区', lat: 34.6490, lng: 112.3960 },
          { name: '吉利区', lat: 34.9000, lng: 112.5840 },
          { name: '洛龙区', lat: 34.6190, lng: 112.4550 },
          { name: '孟津区', lat: 34.7940, lng: 112.4440 },
          { name: '新安区', lat: 34.7280, lng: 112.1330 },
          { name: '栾川县', lat: 33.7850, lng: 111.6180 },
          { name: '嵩县', lat: 34.1350, lng: 112.0850 },
          { name: '汝阳县', lat: 34.1540, lng: 112.4730 },
          { name: '宜阳县', lat: 34.5150, lng: 112.1790 },
          { name: '洛宁县', lat: 34.3890, lng: 111.6540 },
          { name: '伊川县', lat: 34.4220, lng: 112.4260 },
          { name: '偃师区', lat: 34.7280, lng: 112.7890 }
        ]
      },
      { name: '开封市', lat: 34.7971, lng: 114.3080, districts: [] },
      { name: '平顶山市', lat: 33.7662, lng: 113.1925, districts: [] },
      { name: '安阳市', lat: 36.0997, lng: 114.3926, districts: [] },
      { name: '鹤壁市', lat: 35.7475, lng: 114.2974, districts: [] },
      { name: '新乡市', lat: 35.3030, lng: 113.8835, districts: [] },
      { name: '焦作市', lat: 35.2340, lng: 113.2418, districts: [] },
      { name: '濮阳市', lat: 35.7627, lng: 115.0296, districts: [] },
      { name: '许昌市', lat: 34.0357, lng: 113.8523, districts: [] },
      { name: '漯河市', lat: 33.5816, lng: 114.0166, districts: [] },
      { name: '三门峡市', lat: 34.7734, lng: 111.2005, districts: [] },
      { name: '南阳市', lat: 32.9908, lng: 112.5283, districts: [] },
      { name: '商丘市', lat: 34.4147, lng: 115.6562, districts: [] },
      { name: '信阳市', lat: 32.1471, lng: 114.0913, districts: [] },
      { name: '周口市', lat: 33.6259, lng: 114.6498, districts: [] },
      { name: '驻马店市', lat: 32.9802, lng: 114.0228, districts: [] }
    ]
  },

  '湖北省': {
    type: '省',
    lat: 30.5928, lng: 114.3055,
    cities: [
      {
        name: '武汉市', lat: 30.5928, lng: 114.3055,
        districts: [
          { name: '江岸区', lat: 30.5946, lng: 114.3090 },
          { name: '江汉区', lat: 30.6010, lng: 114.2700 },
          { name: '硚口区', lat: 30.5670, lng: 114.2640 },
          { name: '汉阳区', lat: 30.5490, lng: 114.2750 },
          { name: '武昌区', lat: 30.5540, lng: 114.3160 },
          { name: '青山区', lat: 30.6400, lng: 114.3910 },
          { name: '洪山区', lat: 30.5010, lng: 114.3440 },
          { name: '东西湖区', lat: 30.6200, lng: 114.1370 },
          { name: '汉南区', lat: 30.3090, lng: 114.0820 },
          { name: '蔡甸区', lat: 30.5830, lng: 114.0290 },
          { name: '江夏区', lat: 30.3740, lng: 114.3210 },
          { name: '黄陂区', lat: 30.8830, lng: 114.3740 },
          { name: '新洲区', lat: 30.8410, lng: 114.8020 }
        ]
      },
      { name: '黄石市', lat: 30.1991, lng: 115.0386, districts: [] },
      { name: '十堰市', lat: 32.6292, lng: 110.7980, districts: [] },
      { name: '宜昌市', lat: 30.6918, lng: 111.2864, districts: [] },
      { name: '襄阳市', lat: 32.0091, lng: 112.1227, districts: [] },
      { name: '鄂州市', lat: 30.3903, lng: 114.8949, districts: [] },
      { name: '荆门市', lat: 31.0354, lng: 112.2046, districts: [] },
      { name: '孝感市', lat: 30.9244, lng: 113.9268, districts: [] },
      { name: '荆州市', lat: 30.3263, lng: 112.2397, districts: [] },
      { name: '黄冈市', lat: 30.4539, lng: 114.8724, districts: [] },
      { name: '咸宁市', lat: 29.8413, lng: 114.3224, districts: [] },
      { name: '随州市', lat: 31.6901, lng: 113.3826, districts: [] },
      { name: '恩施土家族苗族自治州', lat: 30.2720, lng: 109.4880, districts: [] }
    ]
  },

  '湖南省': {
    type: '省',
    lat: 28.2282, lng: 112.9388,
    cities: [
      {
        name: '长沙市', lat: 28.2282, lng: 112.9388,
        districts: [
          { name: '芙蓉区', lat: 28.1850, lng: 113.0320 },
          { name: '天心区', lat: 28.1130, lng: 112.9890 },
          { name: '岳麓区', lat: 28.2350, lng: 112.9120 },
          { name: '开福区', lat: 28.2550, lng: 112.9850 },
          { name: '雨花区', lat: 28.1350, lng: 113.0350 },
          { name: '望城区', lat: 28.3610, lng: 112.8190 },
          { name: '长沙县', lat: 28.2450, lng: 113.0800 },
          { name: '浏阳市', lat: 28.1570, lng: 113.6410 },
          { name: '宁乡市', lat: 28.2540, lng: 112.5520 }
        ]
      },
      { name: '株洲市', lat: 27.8274, lng: 113.1340, districts: [] },
      { name: '湘潭市', lat: 27.8292, lng: 112.9440, districts: [] },
      { name: '衡阳市', lat: 26.8935, lng: 112.5719, districts: [] },
      { name: '邵阳市', lat: 27.2387, lng: 111.4683, districts: [] },
      { name: '岳阳市', lat: 29.3563, lng: 113.1284, districts: [] },
      { name: '常德市', lat: 29.0316, lng: 111.6986, districts: [] },
      { name: '张家界市', lat: 29.1170, lng: 110.4792, districts: [] },
      { name: '益阳市', lat: 28.5530, lng: 112.3553, districts: [] },
      { name: '郴州市', lat: 25.7703, lng: 113.0147, districts: [] },
      { name: '永州市', lat: 26.4345, lng: 111.6132, districts: [] },
      { name: '怀化市', lat: 27.5492, lng: 109.9582, districts: [] },
      { name: '娄底市', lat: 27.7283, lng: 112.0084, districts: [] },
      { name: '湘西土家族苗族自治州', lat: 28.3119, lng: 109.7390, districts: [] }
    ]
  },

  // ==================== 华南地区 ====================
  '广东省': {
    type: '省',
    lat: 23.1291, lng: 113.2644,
    cities: [
      {
        name: '广州市', lat: 23.1291, lng: 113.2644,
        districts: [
          { name: '荔湾区', lat: 23.1258, lng: 113.2442 },
          { name: '越秀区', lat: 23.1290, lng: 113.2660 },
          { name: '海珠区', lat: 23.0839, lng: 113.2620 },
          { name: '天河区', lat: 23.1246, lng: 113.3610 },
          { name: '白云区', lat: 23.1573, lng: 113.2730 },
          { name: '黄埔区', lat: 23.1066, lng: 113.4590 },
          { name: '番禺区', lat: 22.9370, lng: 113.3840 },
          { name: '花都区', lat: 23.4030, lng: 113.2200 },
          { name: '南沙区', lat: 22.7700, lng: 113.5250 },
          { name: '从化区', lat: 23.5480, lng: 113.5860 },
          { name: '增城区', lat: 23.2610, lng: 113.8100 }
        ]
      },
      {
        name: '深圳市', lat: 22.5431, lng: 114.0579,
        districts: [
          { name: '罗湖区', lat: 22.5554, lng: 114.1310 },
          { name: '福田区', lat: 22.5410, lng: 114.0580 },
          { name: '南山区', lat: 22.5333, lng: 113.9300 },
          { name: '宝安区', lat: 22.5536, lng: 113.8830 },
          { name: '龙岗区', lat: 22.7199, lng: 114.2470 },
          { name: '盐田区', lat: 22.5570, lng: 114.2350 },
          { name: '龙华区', lat: 22.6538, lng: 114.0440 },
          { name: '坪山区', lat: 22.6900, lng: 114.3310 },
          { name: '光明区', lat: 22.7489, lng: 113.9340 }
        ]
      },
      { name: '珠海市', lat: 22.2710, lng: 113.5767, districts: [] },
      { name: '汕头市', lat: 23.3535, lng: 116.6820, districts: [] },
      { name: '佛山市', lat: 23.0218, lng: 113.1219, districts: [] },
      { name: '韶关市', lat: 24.8107, lng: 113.5915, districts: [] },
      { name: '湛江市', lat: 21.2706, lng: 110.3594, districts: [] },
      { name: '肇庆市', lat: 23.0470, lng: 112.4658, districts: [] },
      { name: '江门市', lat: 22.5787, lng: 113.0823, districts: [] },
      { name: '茂名市', lat: 21.6630, lng: 110.9254, districts: [] },
      { name: '惠州市', lat: 23.1116, lng: 114.4163, districts: [] },
      { name: '梅州市', lat: 24.2884, lng: 116.1228, districts: [] },
      { name: '汕尾市', lat: 22.7787, lng: 115.3759, districts: [] },
      { name: '河源市', lat: 23.7432, lng: 114.6978, districts: [] },
      { name: '阳江市', lat: 21.8579, lng: 111.9821, districts: [] },
      { name: '清远市', lat: 23.6817, lng: 113.0560, districts: [] },
      { name: '东莞市', lat: 23.0207, lng: 113.7518, districts: [] },
      { name: '中山市', lat: 22.5170, lng: 113.3927, districts: [] },
      { name: '潮州市', lat: 23.6568, lng: 116.6226, districts: [] },
      { name: '揭阳市', lat: 23.5500, lng: 116.3729, districts: [] },
      { name: '云浮市', lat: 22.9151, lng: 112.0444, districts: [] }
    ]
  },

  '广西壮族自治区': {
    type: '自治区',
    lat: 22.8170, lng: 108.3669,
    cities: [
      {
        name: '南宁市', lat: 22.8170, lng: 108.3669,
        districts: [
          { name: '兴宁区', lat: 22.8530, lng: 108.3680 },
          { name: '青秀区', lat: 22.7850, lng: 108.4960 },
          { name: '江南区', lat: 22.7810, lng: 108.3100 },
          { name: '西乡塘区', lat: 22.8370, lng: 108.3130 },
          { name: '良庆区', lat: 22.7510, lng: 108.3200 },
          { name: '邕宁区', lat: 22.7560, lng: 108.4870 },
          { name: '武鸣区', lat: 23.1590, lng: 108.2770 },
          { name: '隆安县', lat: 23.1660, lng: 107.6910 },
          { name: '马山县', lat: 23.3030, lng: 108.1770 },
          { name: '上林县', lat: 23.4320, lng: 108.6050 },
          { name: '宾阳县', lat: 23.2170, lng: 108.8110 },
          { name: '横州市', lat: 22.6810, lng: 109.2620 }
        ]
      },
      { name: '柳州市', lat: 24.3264, lng: 109.4280, districts: [] },
      {
        name: '桂林市', lat: 25.2736, lng: 110.2900,
        districts: [
          { name: '秀峰区', lat: 25.2736, lng: 110.2640 },
          { name: '叠彩区', lat: 25.3140, lng: 110.3030 },
          { name: '象山区', lat: 25.2620, lng: 110.2820 },
          { name: '七星区', lat: 25.2530, lng: 110.3170 },
          { name: '雁山区', lat: 25.0600, lng: 110.3090 },
          { name: '临桂区', lat: 25.2440, lng: 110.2120 },
          { name: '阳朔县', lat: 24.7330, lng: 110.4890 },
          { name: '灵川县', lat: 25.3950, lng: 110.3230 },
          { name: '全州县', lat: 25.9280, lng: 111.0730 },
          { name: '兴安县', lat: 25.6110, lng: 110.6710 },
          { name: '永福县', lat: 24.9800, lng: 109.9830 },
          { name: '灌阳县', lat: 25.4890, lng: 111.1610 },
          { name: '龙胜各族自治县', lat: 25.7960, lng: 110.0110 },
          { name: '资源县', lat: 26.0420, lng: 110.6530 },
          { name: '平乐县', lat: 24.6330, lng: 110.6420 },
          { name: '荔浦市', lat: 24.4890, lng: 110.3970 },
          { name: '恭城瑶族自治县', lat: 24.8330, lng: 110.8300 }
        ]
      },
      { name: '梧州市', lat: 23.4769, lng: 111.2791, districts: [] },
      { name: '北海市', lat: 21.4812, lng: 109.1198, districts: [] },
      { name: '防城港市', lat: 21.6146, lng: 108.3545, districts: [] },
      { name: '钦州市', lat: 21.9813, lng: 108.6543, districts: [] },
      { name: '贵港市', lat: 23.0936, lng: 109.6021, districts: [] },
      { name: '玉林市', lat: 22.6541, lng: 110.1540, districts: [] },
      { name: '百色市', lat: 23.9024, lng: 106.6182, districts: [] },
      { name: '贺州市', lat: 24.4033, lng: 111.5520, districts: [] },
      { name: '河池市', lat: 24.6926, lng: 108.0853, districts: [] },
      { name: '来宾市', lat: 23.7503, lng: 109.2214, districts: [] },
      { name: '崇左市', lat: 22.3770, lng: 107.3643, districts: [] }
    ]
  },

  '海南省': {
    type: '省',
    lat: 20.0440, lng: 110.1990,
    cities: [
      {
        name: '海口市', lat: 20.0440, lng: 110.1990,
        districts: [
          { name: '秀英区', lat: 20.0010, lng: 110.2930 },
          { name: '龙华区', lat: 20.0310, lng: 110.3280 },
          { name: '琼山区', lat: 19.9830, lng: 110.3540 },
          { name: '美兰区', lat: 20.0290, lng: 110.3690 }
        ]
      },
      {
        name: '三亚市', lat: 18.2528, lng: 109.5119,
        districts: [
          { name: '海棠区', lat: 18.4080, lng: 109.7630 },
          { name: '吉阳区', lat: 18.2470, lng: 109.5110 },
          { name: '天涯区', lat: 18.2460, lng: 109.2330 },
          { name: '崖州区', lat: 18.3530, lng: 109.1710 }
        ]
      },
      { name: '三沙市', lat: 16.8313, lng: 112.3322, districts: [] },
      { name: '儋州市', lat: 19.5211, lng: 109.5769, districts: [] }
    ]
  },

  // ==================== 西南地区 ====================
  '四川省': {
    type: '省',
    lat: 30.5728, lng: 104.0668,
    cities: [
      {
        name: '成都市', lat: 30.5728, lng: 104.0668,
        districts: [
          { name: '锦江区', lat: 30.6570, lng: 104.0840 },
          { name: '青羊区', lat: 30.6740, lng: 104.0610 },
          { name: '金牛区', lat: 30.6910, lng: 104.0520 },
          { name: '武侯区', lat: 30.6420, lng: 104.0430 },
          { name: '成华区', lat: 30.6590, lng: 104.1020 },
          { name: '龙泉驿区', lat: 30.5560, lng: 104.2750 },
          { name: '青白江区', lat: 30.8790, lng: 104.2510 },
          { name: '新都区', lat: 30.8240, lng: 104.1570 },
          { name: '温江区', lat: 30.6840, lng: 103.8560 },
          { name: '双流区', lat: 30.5140, lng: 103.8640 },
          { name: '郫都区', lat: 30.8140, lng: 103.8870 },
          { name: '金堂县', lat: 30.8620, lng: 104.4120 },
          { name: '大邑县', lat: 30.5870, lng: 103.5220 },
          { name: '蒲江县', lat: 30.1970, lng: 103.5060 },
          { name: '新津县', lat: 30.4100, lng: 103.8120 },
          { name: '都江堰市', lat: 30.9880, lng: 103.6470 },
          { name: '彭州市', lat: 30.9900, lng: 103.9580 },
          { name: '邛崃市', lat: 30.4100, lng: 103.4620 },
          { name: '崇州市', lat: 30.6300, lng: 103.6730 },
          { name: '简阳市', lat: 30.3900, lng: 104.5470 }
        ]
      },
      { name: '自贡市', lat: 29.3392, lng: 104.7784, districts: [] },
      { name: '攀枝花市', lat: 26.5823, lng: 101.7188, districts: [] },
      { name: '泸州市', lat: 28.8717, lng: 105.4425, districts: [] },
      { name: '德阳市', lat: 31.1270, lng: 104.3980, districts: [] },
      { name: '绵阳市', lat: 31.4680, lng: 104.6796, districts: [] },
      { name: '广元市', lat: 32.4353, lng: 105.8256, districts: [] },
      { name: '遂宁市', lat: 30.5333, lng: 105.5928, districts: [] },
      { name: '内江市', lat: 29.5800, lng: 105.0586, districts: [] },
      { name: '乐山市', lat: 29.5521, lng: 103.7660, districts: [] },
      { name: '南充市', lat: 30.8373, lng: 106.1105, districts: [] },
      { name: '眉山市', lat: 30.0754, lng: 103.8488, districts: [] },
      { name: '宜宾市', lat: 28.7513, lng: 104.6308, districts: [] },
      { name: '广安市', lat: 30.4559, lng: 106.6333, districts: [] },
      { name: '达州市', lat: 31.2089, lng: 107.4682, districts: [] },
      { name: '雅安市', lat: 29.9773, lng: 103.0010, districts: [] },
      { name: '巴中市', lat: 31.8691, lng: 106.7478, districts: [] },
      { name: '资阳市', lat: 30.1222, lng: 104.6279, districts: [] },
      { name: '阿坝藏族羌族自治州', lat: 31.8990, lng: 102.2214, districts: [] },
      { name: '甘孜藏族自治州', lat: 30.0486, lng: 101.9625, districts: [] },
      { name: '凉山彝族自治州', lat: 27.8868, lng: 102.2645, districts: [] }
    ]
  },

  '贵州省': {
    type: '省',
    lat: 26.6470, lng: 106.6302,
    cities: [
      {
        name: '贵阳市', lat: 26.6470, lng: 106.6302,
        districts: [
          { name: '南明区', lat: 26.5680, lng: 106.7140 },
          { name: '云岩区', lat: 26.6040, lng: 106.7250 },
          { name: '花溪区', lat: 26.4090, lng: 106.6700 },
          { name: '乌当区', lat: 26.6300, lng: 106.7500 },
          { name: '白云区', lat: 26.6800, lng: 106.6230 },
          { name: '观山湖区', lat: 26.6010, lng: 106.6230 },
          { name: '开阳县', lat: 27.0570, lng: 106.9650 },
          { name: '息烽县', lat: 27.0900, lng: 106.7400 },
          { name: '修文县', lat: 26.8380, lng: 106.5940 },
          { name: '清镇市', lat: 26.5530, lng: 106.4700 }
        ]
      },
      { name: '六盘水市', lat: 26.5930, lng: 104.8333, districts: [] },
      { name: '遵义市', lat: 27.7256, lng: 106.9273, districts: [] },
      { name: '安顺市', lat: 26.2456, lng: 105.9462, districts: [] },
      { name: '毕节市', lat: 27.2835, lng: 105.2847, districts: [] },
      { name: '铜仁市', lat: 27.7306, lng: 109.1892, districts: [] },
      { name: '黔西南布依族苗族自治州', lat: 25.0880, lng: 104.9063, districts: [] },
      { name: '黔东南苗族侗族自治州', lat: 26.5835, lng: 107.9829, districts: [] },
      { name: '黔南布依族苗族自治州', lat: 26.2582, lng: 107.5170, districts: [] }
    ]
  },

  '云南省': {
    type: '省',
    lat: 25.0453, lng: 102.7097,
    cities: [
      {
        name: '昆明市', lat: 25.0453, lng: 102.7097,
        districts: [
          { name: '五华区', lat: 25.0500, lng: 102.6570 },
          { name: '盘龙区', lat: 25.0410, lng: 102.7520 },
          { name: '官渡区', lat: 24.9910, lng: 102.7430 },
          { name: '西山区', lat: 24.9660, lng: 102.6620 },
          { name: '东川区', lat: 26.0830, lng: 103.1880 },
          { name: '呈贡区', lat: 24.8900, lng: 102.8010 },
          { name: '晋宁区', lat: 24.6700, lng: 102.5950 },
          { name: '富民县', lat: 25.2220, lng: 102.4980 },
          { name: '宜良县', lat: 24.9170, lng: 103.4100 },
          { name: '石林彝族自治县', lat: 24.7710, lng: 103.2900 },
          { name: '嵩明县', lat: 25.3390, lng: 103.0370 },
          { name: '禄劝彝族苗族自治县', lat: 25.5520, lng: 102.4710 },
          { name: '寻甸回族彝族自治县', lat: 25.5400, lng: 103.2570 },
          { name: '安宁市', lat: 24.9200, lng: 102.4780 }
        ]
      },
      { name: '曲靖市', lat: 25.4900, lng: 103.7966, districts: [] },
      { name: '玉溪市', lat: 24.3518, lng: 102.5460, districts: [] },
      { name: '保山市', lat: 25.1120, lng: 99.1617, districts: [] },
      { name: '昭通市', lat: 27.3383, lng: 103.7172, districts: [] },
      {
        name: '丽江市', lat: 26.8721, lng: 100.2260,
        districts: [
          { name: '古城区', lat: 26.8721, lng: 100.2257 },
          { name: '玉龙纳西族自治县', lat: 26.8230, lng: 100.2380 },
          { name: '永胜县', lat: 26.6830, lng: 100.7470 },
          { name: '华坪县', lat: 26.6290, lng: 101.2660 },
          { name: '宁蒗彝族自治县', lat: 27.2810, lng: 100.8520 }
        ]
      },
      { name: '普洱市', lat: 22.8252, lng: 100.9660, districts: [] },
      { name: '临沧市', lat: 23.8770, lng: 100.0899, districts: [] },
      { name: '楚雄彝族自治州', lat: 25.0292, lng: 101.5280, districts: [] },
      { name: '红河哈尼族彝族自治州', lat: 23.3631, lng: 103.3756, districts: [] },
      { name: '文山壮族苗族自治州', lat: 23.3694, lng: 104.2446, districts: [] },
      { name: '西双版纳傣族自治州', lat: 22.0074, lng: 100.7972, districts: [] },
      { name: '大理白族自治州', lat: 25.6065, lng: 100.2679, districts: [] },
      { name: '德宏傣族景颇族自治州', lat: 24.4364, lng: 98.5854, districts: [] },
      { name: '怒江傈僳族自治州', lat: 25.8170, lng: 98.8543, districts: [] },
      { name: '迪庆藏族自治州', lat: 27.8290, lng: 99.7063, districts: [] }
    ]
  },

  '西藏自治区': {
    type: '自治区',
    lat: 29.6500, lng: 91.1409,
    cities: [
      {
        name: '拉萨市', lat: 29.6500, lng: 91.1409,
        districts: [
          { name: '城关区', lat: 29.6540, lng: 91.1380 },
          { name: '堆龙德庆区', lat: 29.6490, lng: 91.0030 },
          { name: '达孜区', lat: 29.6710, lng: 91.3490 },
          { name: '林周县', lat: 29.8940, lng: 91.2620 },
          { name: '当雄县', lat: 30.4780, lng: 91.1030 },
          { name: '尼木县', lat: 29.4310, lng: 90.1640 },
          { name: '曲水县', lat: 29.3560, lng: 90.7440 },
          { name: '墨竹工卡县', lat: 29.8350, lng: 91.7280 }
        ]
      },
      { name: '日喀则市', lat: 29.2671, lng: 88.8808, districts: [] },
      { name: '昌都市', lat: 31.1369, lng: 97.1786, districts: [] },
      { name: '林芝市', lat: 29.6486, lng: 94.3624, districts: [] },
      { name: '山南市', lat: 29.2360, lng: 91.7730, districts: [] },
      { name: '那曲市', lat: 31.4762, lng: 92.0513, districts: [] },
      { name: '阿里地区', lat: 32.5017, lng: 80.1055, districts: [] }
    ]
  },

  // ==================== 西北地区 ====================
  '陕西省': {
    type: '省',
    lat: 34.3416, lng: 108.9398,
    cities: [
      {
        name: '西安市', lat: 34.3416, lng: 108.9398,
        districts: [
          { name: '新城区', lat: 34.2660, lng: 108.9600 },
          { name: '碑林区', lat: 34.2300, lng: 108.9340 },
          { name: '莲湖区', lat: 34.2650, lng: 108.9400 },
          { name: '灞桥区', lat: 34.2730, lng: 109.0640 },
          { name: '未央区', lat: 34.2930, lng: 108.9470 },
          { name: '雁塔区', lat: 34.2230, lng: 108.9270 },
          { name: '阎良区', lat: 34.6620, lng: 109.2290 },
          { name: '临潼区', lat: 34.3670, lng: 109.2140 },
          { name: '长安区', lat: 34.1580, lng: 108.9070 },
          { name: '高陵区', lat: 34.5350, lng: 109.0880 },
          { name: '鄠邑区', lat: 34.1080, lng: 108.6070 },
          { name: '蓝田县', lat: 34.1510, lng: 109.3230 },
          { name: '周至县', lat: 34.1640, lng: 108.2220 }
        ]
      },
      { name: '铜川市', lat: 34.8966, lng: 108.9451, districts: [] },
      { name: '宝鸡市', lat: 34.3760, lng: 107.2370, districts: [] },
      { name: '咸阳市', lat: 34.3296, lng: 108.7089, districts: [] },
      { name: '渭南市', lat: 34.4998, lng: 109.5098, districts: [] },
      { name: '延安市', lat: 36.5853, lng: 109.4898, districts: [] },
      { name: '汉中市', lat: 33.0674, lng: 107.0238, districts: [] },
      { name: '榆林市', lat: 38.2854, lng: 109.7348, districts: [] },
      { name: '安康市', lat: 32.6900, lng: 109.0293, districts: [] },
      { name: '商洛市', lat: 33.8700, lng: 109.9400, districts: [] }
    ]
  },

  '甘肃省': {
    type: '省',
    lat: 36.0611, lng: 103.8343,
    cities: [
      {
        name: '兰州市', lat: 36.0611, lng: 103.8343,
        districts: [
          { name: '城关区', lat: 36.0570, lng: 103.8340 },
          { name: '七里河区', lat: 36.0600, lng: 103.7860 },
          { name: '西固区', lat: 36.0880, lng: 103.6280 },
          { name: '安宁区', lat: 36.1020, lng: 103.7190 },
          { name: '红古区', lat: 36.0830, lng: 102.8590 },
          { name: '永登县', lat: 36.7370, lng: 103.2600 },
          { name: '皋兰县', lat: 36.3320, lng: 103.9470 },
          { name: '榆中县', lat: 35.8450, lng: 104.1130 }
        ]
      },
      { name: '嘉峪关市', lat: 39.7726, lng: 98.2894, districts: [] },
      { name: '金昌市', lat: 38.5160, lng: 102.1877, districts: [] },
      { name: '白银市', lat: 36.5447, lng: 104.1389, districts: [] },
      { name: '天水市', lat: 34.5809, lng: 105.7249, districts: [] },
      { name: '武威市', lat: 37.9283, lng: 102.6345, districts: [] },
      { name: '张掖市', lat: 38.9262, lng: 100.4495, districts: [] },
      { name: '平凉市', lat: 35.5428, lng: 106.6652, districts: [] },
      { name: '酒泉市', lat: 39.7321, lng: 98.4941, districts: [] },
      { name: '庆阳市', lat: 35.7091, lng: 107.6444, districts: [] },
      { name: '定西市', lat: 35.5806, lng: 104.6264, districts: [] },
      { name: '陇南市', lat: 33.4008, lng: 104.9218, districts: [] },
      { name: '临夏回族自治州', lat: 35.6011, lng: 103.2106, districts: [] },
      { name: '甘南藏族自治州', lat: 34.9834, lng: 102.9110, districts: [] }
    ]
  },

  '青海省': {
    type: '省',
    lat: 36.6171, lng: 101.7782,
    cities: [
      {
        name: '西宁市', lat: 36.6171, lng: 101.7782,
        districts: [
          { name: '城东区', lat: 36.5990, lng: 101.8030 },
          { name: '城中区', lat: 36.5840, lng: 101.7860 },
          { name: '城西区', lat: 36.6280, lng: 101.7660 },
          { name: '城北区', lat: 36.6500, lng: 101.7660 },
          { name: '湟中区', lat: 36.5010, lng: 101.5720 },
          { name: '湟源县', lat: 36.6820, lng: 101.2560 },
          { name: '大通回族土族自治县', lat: 36.9250, lng: 101.6850 }
        ]
      },
      { name: '海东市', lat: 36.5029, lng: 102.1028, districts: [] },
      { name: '海北藏族自治州', lat: 36.9540, lng: 100.9010, districts: [] },
      { name: '黄南藏族自治州', lat: 35.5177, lng: 102.0153, districts: [] },
      { name: '海南藏族自治州', lat: 36.2864, lng: 100.6198, districts: [] },
      { name: '果洛藏族自治州', lat: 34.4804, lng: 100.2447, districts: [] },
      { name: '玉树藏族自治州', lat: 33.0042, lng: 97.0069, districts: [] },
      { name: '海西蒙古族藏族自治州', lat: 37.3745, lng: 97.3708, districts: [] }
    ]
  },

  '宁夏回族自治区': {
    type: '自治区',
    lat: 38.4872, lng: 106.2309,
    cities: [
      {
        name: '银川市', lat: 38.4872, lng: 106.2309,
        districts: [
          { name: '兴庆区', lat: 38.4740, lng: 106.2820 },
          { name: '金凤区', lat: 38.4820, lng: 106.2390 },
          { name: '西夏区', lat: 38.5220, lng: 106.1520 },
          { name: '永宁县', lat: 38.2770, lng: 106.2520 },
          { name: '贺兰县', lat: 38.5540, lng: 106.3510 },
          { name: '灵武市', lat: 38.1390, lng: 106.3400 }
        ]
      },
      { name: '石嘴山市', lat: 38.9844, lng: 106.3762, districts: [] },
      { name: '吴忠市', lat: 37.9987, lng: 106.1988, districts: [] },
      { name: '固原市', lat: 36.0160, lng: 106.2425, districts: [] },
      { name: '中卫市', lat: 37.5149, lng: 105.1966, districts: [] }
    ]
  },

  '新疆维吾尔自治区': {
    type: '自治区',
    lat: 43.7928, lng: 87.6271,
    cities: [
      {
        name: '乌鲁木齐市', lat: 43.7928, lng: 87.6271,
        districts: [
          { name: '天山区', lat: 43.7650, lng: 87.6310 },
          { name: '沙依巴克区', lat: 43.8010, lng: 87.5960 },
          { name: '新市区', lat: 43.8440, lng: 87.5650 },
          { name: '水磨沟区', lat: 43.8260, lng: 87.6530 },
          { name: '头屯河区', lat: 43.8740, lng: 87.4260 },
          { name: '达坂城区', lat: 43.3580, lng: 88.3140 },
          { name: '米东区', lat: 43.9730, lng: 87.6550 },
          { name: '乌鲁木齐县', lat: 43.4780, lng: 87.1650 }
        ]
      },
      { name: '克拉玛依市', lat: 45.5798, lng: 84.8893, districts: [] },
      { name: '吐鲁番市', lat: 42.9513, lng: 89.1895, districts: [] },
      { name: '哈密市', lat: 42.8332, lng: 93.5151, districts: [] },
      { name: '昌吉回族自治州', lat: 44.0145, lng: 87.3082, districts: [] },
      { name: '博尔塔拉蒙古自治州', lat: 44.9052, lng: 82.0752, districts: [] },
      { name: '巴音郭楞蒙古自治州', lat: 41.7688, lng: 86.1510, districts: [] },
      { name: '阿克苏地区', lat: 41.1673, lng: 80.2610, districts: [] },
      { name: '克孜勒苏柯尔克孜自治州', lat: 39.7134, lng: 76.1677, districts: [] },
      { name: '喀什地区', lat: 39.4677, lng: 75.9893, districts: [] },
      { name: '和田地区', lat: 37.1124, lng: 79.9146, districts: [] },
      { name: '伊犁哈萨克自治州', lat: 43.9191, lng: 81.3244, districts: [] },
      { name: '塔城地区', lat: 46.7453, lng: 82.9857, districts: [] },
      { name: '阿勒泰地区', lat: 47.8484, lng: 88.1396, districts: [] }
    ]
  },

  // ==================== 台湾省 ====================
  '台湾省': {
    type: '省',
    lat: 25.0330, lng: 121.5654,
    cities: [
      { name: '台北市', lat: 25.0330, lng: 121.5654, districts: [] },
      { name: '新北市', lat: 25.0120, lng: 121.4653, districts: [] },
      { name: '桃园市', lat: 24.9936, lng: 121.3010, districts: [] },
      { name: '台中市', lat: 24.1477, lng: 120.6044, districts: [] },
      { name: '台南市', lat: 22.9908, lng: 120.2133, districts: [] },
      { name: '高雄市', lat: 22.6273, lng: 120.3014, districts: [] },
      { name: '基隆市', lat: 25.1276, lng: 121.7392, districts: [] },
      { name: '新竹市', lat: 24.8016, lng: 120.9686, districts: [] },
      { name: '嘉义市', lat: 23.4800, lng: 120.4491, districts: [] },
      { name: '新竹县', lat: 24.7032, lng: 121.0012, districts: [] },
      { name: '苗栗县', lat: 24.5616, lng: 120.8210, districts: [] },
      { name: '彰化县', lat: 24.0762, lng: 120.4818, districts: [] },
      { name: '南投县', lat: 23.8383, lng: 120.9417, districts: [] },
      { name: '云林县', lat: 23.7255, lng: 120.3897, districts: [] },
      { name: '嘉义县', lat: 23.4516, lng: 120.2580, districts: [] },
      { name: '屏东县', lat: 22.6692, lng: 120.4866, districts: [] },
      { name: '宜兰县', lat: 24.7021, lng: 121.4197, districts: [] },
      { name: '花莲县', lat: 23.7569, lng: 121.3542, districts: [] },
      { name: '台东县', lat: 22.7583, lng: 121.1444, districts: [] },
      { name: '澎湖县', lat: 23.5650, lng: 119.6150, districts: [] }
    ]
  },

  // ==================== 特别行政区 ====================
  '香港特别行政区': {
    type: '特别行政区',
    lat: 22.3193, lng: 114.1694,
    cities: [{
      name: '香港',
      lat: 22.3193, lng: 114.1694,
      districts: [
        { name: '中西区', lat: 22.2819, lng: 114.1549 },
        { name: '湾仔区', lat: 22.2753, lng: 114.1751 },
        { name: '东区', lat: 22.2828, lng: 114.2260 },
        { name: '南区', lat: 22.2472, lng: 114.1590 },
        { name: '油尖旺区', lat: 22.3193, lng: 114.1694 },
        { name: '深水埗区', lat: 22.3308, lng: 114.1592 },
        { name: '九龙城区', lat: 22.3282, lng: 114.1916 },
        { name: '黄大仙区', lat: 22.3339, lng: 114.1969 },
        { name: '观塘区', lat: 22.3134, lng: 114.2258 },
        { name: '葵青区', lat: 22.3628, lng: 114.1396 },
        { name: '荃湾区', lat: 22.3685, lng: 114.1227 },
        { name: '屯门区', lat: 22.3916, lng: 113.9772 },
        { name: '元朗区', lat: 22.4445, lng: 114.0358 },
        { name: '北区', lat: 22.4947, lng: 114.1383 },
        { name: '大埔区', lat: 22.4507, lng: 114.1717 },
        { name: '西贡区', lat: 22.3794, lng: 114.2716 },
        { name: '沙田区', lat: 22.3826, lng: 114.1886 },
        { name: '离岛区', lat: 22.2819, lng: 113.9457 }
      ]
    }]
  },

  '澳门特别行政区': {
    type: '特别行政区',
    lat: 22.1987, lng: 113.5439,
    cities: [{
      name: '澳门',
      lat: 22.1987, lng: 113.5439,
      districts: [
        { name: '花地玛堂区', lat: 22.2076, lng: 113.5529 },
        { name: '圣安多尼堂区', lat: 22.1991, lng: 113.5390 },
        { name: '大堂区', lat: 22.1944, lng: 113.5523 },
        { name: '望德堂区', lat: 22.1951, lng: 113.5560 },
        { name: '风顺堂区', lat: 22.1877, lng: 113.5416 },
        { name: '嘉模堂区', lat: 22.1537, lng: 113.5587 },
        { name: '圣方济各堂区', lat: 22.1240, lng: 113.5591 },
        { name: '路氹填海区', lat: 22.1370, lng: 113.5650 }
      ]
    }]
  }
};

// ==================== 辅助函数 ====================

/**
 * 获取所有省份名称列表
 * @returns {string[]} 省份名称数组
 */
export function getProvinces() {
  return Object.keys(adminDivisions);
}

/**
 * 获取指定省份的城市列表
 * @param {string} provinceName - 省份名称
 * @returns {Array} 城市对象数组，每个对象包含 name, lat, lng, districts
 */
export function getCities(provinceName) {
  const province = adminDivisions[provinceName];
  if (!province) {
    console.warn(`未找到省份: ${provinceName}`);
    return [];
  }
  return province.cities || [];
}

/**
 * 获取指定城市的区/县列表
 * @param {string} provinceName - 省份名称
 * @param {string} cityName - 城市名称
 * @returns {Array} 区/县对象数组，每个对象包含 name, lat, lng
 */
export function getDistricts(provinceName, cityName) {
  const cities = getCities(provinceName);
  const city = cities.find(c => c.name === cityName);
  if (!city) {
    console.warn(`未找到城市: ${cityName}（省份: ${provinceName}）`);
    return [];
  }
  return city.districts || [];
}

/**
 * 查找指定位置的经纬度和完整地址
 * @param {string} provinceName - 省份名称
 * @param {string} cityName - 城市名称
 * @param {string} [districtName] - 区/县名称（可选）
 * @returns {{lat: number, lng: number, fullAddress: string}|null} 位置信息对象
 */
export function findLocation(provinceName, cityName, districtName) {
  const province = adminDivisions[provinceName];
  if (!province) {
    console.warn(`未找到省份: ${provinceName}`);
    return null;
  }

  const city = province.cities.find(c => c.name === cityName);
  if (!city) {
    console.warn(`未找到城市: ${cityName}（省份: ${provinceName}）`);
    return null;
  }

  // 如果未提供区/县名称，返回城市坐标
  if (!districtName) {
    // 直辖市：省份名和城市名相同时，只显示一次
    const address = (provinceName === cityName) ? provinceName : `${provinceName}${cityName}`;
    return {
      lat: city.lat,
      lng: city.lng,
      fullAddress: address
    };
  }

  // 查找区/县
  const district = (city.districts || []).find(d => d.name === districtName);
  if (!district) {
    console.warn(`未找到区/县: ${districtName}（城市: ${cityName}，省份: ${provinceName}）`);
    return null;
  }

  // 直辖市：省份名和城市名相同时，只显示一次
  const prefix = (provinceName === cityName) ? provinceName : `${provinceName}${cityName}`;
  return {
    lat: district.lat,
    lng: district.lng,
    fullAddress: `${prefix}${districtName}`
  };
}

export default adminDivisions;

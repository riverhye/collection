// ts compiler 8xxxx번대 코드는 suggestion
module.exports = function (api) {
  api.cache(true);
  return {
    // presets: 변환 규칙 여러 개가 모인 세트
    presets: ["babel-preset-expo"],
    // plugins: 개별 변환 규칙
    // 빌드 시점에 sql 파일을 JS 문자열로 바꿔서 inline import (원래 JS는 코드 아닌 파일은 import 불가)
    plugins: [["inline-import", { extensions: [".sql"] }]],
  };
};

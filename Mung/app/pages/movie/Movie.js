import React,{Component} from 'react'
import {
    StyleSheet,
    View,
    Text,
    Image,
    StatusBar,
    FlatList,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    Platform,
    WebView,
    Modal,
    ImageBackground,
    ActivityIndicator,
    Dimensions,
    ProgressViewIOS
} from 'react-native'
import JPushModule from 'jpush-react-native';
import CodePush from "react-native-code-push"
import * as Progress from 'react-native-progress';
import {MainBg, WhiteTextColor, GrayWhiteColor, Translucent, White} from '../basestyle/BaseStyle'
import Swiper from 'react-native-swiper'
import {show} from '../../utils/ToastUtils'
import {width,jumpPager} from '../../utils/Utils'
import {App_Name,Cate_Data} from '../../data/constant/BaseContant'
import TouchableView from '../../widget/TouchableView'
import ErrorBean from '../../data/http/ErrorBean'
import HttpMovieManager from '../../data/http/HttpMovieManager'
import StarRating from 'react-native-star-rating'
import LinearGradient from 'react-native-linear-gradient'
import SplashScreen from 'react-native-splash-screen'
import {queryThemeColor} from '../../data/realm/RealmManager'
import NaviBarView from "../../widget/NaviBarView";
import Spinner from 'react-native-spinkit';
const url = 'http://211app.com/wap/index.htm'
const itemHight = 200;
const moviesCount = 20;
const { height} = Dimensions.get('window')
const receiveCustomMsgEvent = 'receivePushMsg'
const receiveNotificationEvent = 'receiveNotification'
const openNotificationEvent = 'openNotification'
const getRegistrationIdEvent = 'getRegistrationId'

export default class Movie extends Component {

    static navigationOptions = {
        header: null,
    }

    /* 为了换肤,不用这个了
    static navigationOptions = ({ navigation }) =>({
        headerTitle: 'Mung',
        headerTitleStyle: {
            color: WhiteTextColor,
            alignSelf: 'center',
        },
        headerStyle: {
            backgroundColor: MainColor,
        },
        headerLeft:(
            <TouchableOpacity
                onPress={()=>{
                    jumpPager(navigation.navigate,"Theme",null)
                }}>
                <Image
                    source={require('../../data/img/icon_theme.png')}
                    style={{
                        width:26,
                        height:26,
                        alignSelf: 'center',
                        marginLeft: 20,
                    }}
                    tintColor={WhiteTextColor}
                />
            </TouchableOpacity>
        ),
        headerRight: (
            <TouchableOpacity
                onPress={()=>{
                    jumpPager(navigation.navigate,"Search",null)
                }}>
                <Image
                    source={require('../../data/img/icon_search.png')}
                    style={{
                        width:26,
                        height:26,
                        alignSelf: 'center',
                        marginRight: 20,
                    }}
                    tintColor={WhiteTextColor}
                />
        </TouchableOpacity>)
    })*/

    constructor(props) {
        super(props)
        this.state = {
            hotMovies:{},
            refreshing: true,
            isInit: false,
            MainColor:queryThemeColor(),

            isShowUpdate: false,
            syncMessage: '正在检测更新',
            mmprogress: 0,
            indeterminate: true,

            isUpdate: false

        }
        this.HttpMovies  = new HttpMovieManager();
        this.requestData();
        this.checkUpdate()
    }


    onChangeTheme() {
        this.setState({
            MainColor:queryThemeColor(), //技巧
        })
    }

    componentDidMount() {
        JPushModule.addnetworkDidLoginListener(() => {
            console.log('连接已登录')
         })
        JPushModule.getRegistrationID((registrationid)=>{
            // this.setState({regid: registrationid});
            console.log('registrationid=',registrationid);
        })
        //打开通知 iOS 10 及以上的系统 \ 在前台收到推送
        JPushModule.addReceiveOpenNotificationListener((result) => {
            console.log('打开通知==', result)
        })
        //iOS 9 以下的系统 
        JPushModule.addReceiveNotificationListener((result) => {
            console.log('打开通知==', result)
        })

        //应用没有启动情况 
        JPushModule.addOpenNotificationLaunchAppListener((result) => {
        console.log('result = ' + result)
        })
        //还是有白屏看来方法后只能这样，后期有时间再改进
        this.timer = setTimeout(()=>{
            SplashScreen.hide()
        },100)
    }
    componentWillUnmount() {
        this.timer && clearTimeout(this.timer);
        JPushModule.removenetworkDidLoginListener();
        JPushModule.removeReceiveNotificationListener();
        JPushModule.removeReceiveOpenNotificationListener();
        JPushModule.removeOpenNotificationLaunchAppEventListener();
    }

    // 热更新
    checkUpdate=()=>{
        CodePush.checkForUpdate().then((update) => {
            console.log('update', update)
            if (!update) {
                this.setState({ syncMessage: '当前是最新配置' })
            } else {
                this.setState({
                    isUpdate: true
                })
                CodePush.sync(
                    {  
                    installMode: CodePush.InstallMode.IMMEDIATE },
                    this.codePushStatusDidChange.bind(this),
                    this.codePushDownloadDidProgress.bind(this)
                ).catch((e) => {
                    console.log(e)
                })

            }
        }).catch((err) => {
            console.log(err)
        })
        CodePush.notifyAppReady()
    }

    codePushStatusDidChange(syncStatus) {
        switch (syncStatus) {
            case CodePush.SyncStatus.CHECKING_FOR_UPDATE:
                this.setState({
                    syncMessage: '正在检查新配置'
                })
                break
            case CodePush.SyncStatus.DOWNLOADING_PACKAGE:
                if (!this.state.isShowUpdate) {
                    this.setState({
                        isShowUpdate: true
                    })
                }
                break
            case CodePush.SyncStatus.INSTALLING_UPDATE:
                break
            case CodePush.SyncStatus.UP_TO_DATE:
                this.setState({
                    syncMessage:'正在加载配置'
                })
                break
            case CodePush.SyncStatus.UPDATE_INSTALLED:
                this.setState({
                    syncMessage: '应用更新完成,重启中...'
                })
                break
            case CodePush.SyncStatus.UNKNOWN_ERROR:
                this.setState({
                    syncMessage: "应用更新出错,请检查设置!"
                });
                break;
        }
    }

    codePushDownloadDidProgress(progress) {
        console.log(progress)
        this.setState({
            syncMessage: `正在下载新配置${(progress.receivedBytes / progress.totalBytes * 100).toFixed(2)}%`,
            mmprogress: Number(progress.receivedBytes / progress.totalBytes),
            indeterminate: false,
        })
    }
    _modalView() {
      return (
          <Modal
              visible={this.state.isShowUpdate}
              animationType={'fade'}
              transparent={true}
              onRequestClose={() => this._onHotUpdateClose()}
          >{this._isShowHotUpdateView()}</Modal>
      );
    }
    _onHotUpdateClose() {
  
    }
    _isShowHotUpdateView(){
      return (
        <ImageBackground
          source={require('../../data/img/icon_spash750-1334.png')}
          style={styles.codepushContainer}>
            <View style={{position:'absolute',left:0,right:0,bottom:0,marginBottom:45}}>
                <Text style={styles.codepushWelcome}>
                    欢迎您,请耐心等待升级完成
                </Text>
                <Text style={styles.codePushText}>
                    {`正在下载${this.state.mmprogress}%`}
                </Text>
                <Progress.Bar
                    style={styles.progressStyle}
                    width={width*2/3}
                    height={5}
                    unfilledColor="#fff"
                    borderWidth={0.5}
                    color="green"
                    progress={this.state.mmprogress}
                    indeterminate={this.state.indeterminate}
                />
                {/* <ProgressViewIOS style={styles.progressView} progressTintColor='blue' progressViewStyle='bar' progress={this.state.mmprogress}/>  */}
            </View>
            
        </ImageBackground>
      )
    }


    requestData() {
        let start = 0;
        if (this.state.hotMovies.start != null) {
            start = this.state.hotMovies.start+2; //服务端数据大量重复
            if (this.state.hotMovies.total <= this.state.hotMovies.start) {
                this.setState({
                    refreshing: false,
                })
                show("已是最新数据")
                return;
            }
        }
        this.HttpMovies.getHottingMovie(this.state.isInit,start,moviesCount)
            .then((movies)=>{
                let preSubjects = this.state.hotMovies.subjects;
                if (preSubjects != null && preSubjects.length>0) {
                    preSubjects.filter((item,i)=>{
                        return i<moviesCount;
                    }).forEach((item,i)=>{
                        movies.subjects.push(item)
                    })
                }
                this.setState({
                    hotMovies:movies,
                    refreshing: false,
                    isInit: true,
                })
            })
            .catch((error)=>{
                if (error != null && error instanceof ErrorBean) {
                    show(error.getErrorMsg())
                } else {
                    show("网络错误")
                }
                this.setState({
                    refreshing: false,
                })
            })
    }

    _swiperChildrenView() {
        let items = this.getHotMovieDatas(true);
        if (items != null && items.length>0) {
            return items.map((item,i)=>{
                return (
                    <TouchableView
                        key={i}
                        onPress={()=>{
                        jumpPager(this.props.navigation.navigate,'MovieDetail',item.id)
                    }}>
                        <View
                            style={[styles.swiper_children_view,{backgroundColor:this.state.MainColor}]}>
                            <Image
                                style={styles.swiper_children_cover}
                                source={{uri:item.images.large}}/>
                            <View style={styles.swiper_children_right}>
                                <Text style={styles.swiper_children_title}
                                      numberOfLines={1}>
                                    {item.title}
                                </Text>
                                <View style={styles.swiper_children_director}>
                                    <Image
                                        source={{uri:item.directors[0].avatars.small}}
                                        style={styles.swiper_children_director_img}
                                    />
                                    <Text style={styles.swiper_children_director_name}
                                          numberOfLines={1}>
                                        {(item.directors[0]!=null?item.directors[0].name:"未知") }
                                    </Text>
                                </View>
                                <View style={styles.swiper_children_casts_view}>
                                    <Text
                                        style={styles.swiper_children_casts_text}
                                        numberOfLines={2}>
                                        主演: {item.casts.map((data,i)=>data.name).join(' ')}
                                    </Text>
                                </View>
                                <View style={styles.swiper_children_genres_view}
                                      numberOfLines={2}>
                                    <Text style={styles.swiper_children_genres_text}>{item.collect_count} 看过</Text>
                                </View>
                                <View style={styles.swiper_children_rating_view}>
                                    <StarRating
                                        disabled={false}
                                        rating={item.rating.average/2}
                                        maxStars={5}
                                        halfStarEnabled={true}
                                        emptyStar={require('../../data/img/icon_unselect.png')}
                                        halfStar={require('../../data/img/icon_half_select.png')}
                                        fullStar={require('../../data/img/icon_selected.png')}
                                        starStyle={{width: 20, height: 20}}
                                        selectedStar={(rating)=>{}}/>
                                    <Text style={styles.swiper_children_rating_text}>{item.rating.average.toFixed(1)}</Text>
                                </View>
                            </View>
                        </View>
                    </TouchableView>
                )
            })
        }
    }

    _cateChildrenView() {
        return Cate_Data.map((item,i)=>{
            return (
                <TouchableView
                    key={i}
                    style={styles.cate_children_touchview}
                    onPress={()=>{
                        jumpPager(this.props.navigation.navigate,'MovieList',{
                            index:item.index,
                            title:item.title,
                        })
                    }}>
                    <View style={styles.cate_children_view}>
                        <LinearGradient
                            colors={item.colors}
                            style={styles.cate_children_linear}>
                            <Image
                                source={item.icon}
                                style={styles.cate_children_image}/>
                        </LinearGradient>
                        <Text
                            style={styles.cate_children_text}>
                            {item.title}
                        </Text>
                    </View>
                </TouchableView>
            )
        })
    }

    _renderItemView(item) {
        return (
            <View style={styles.flat_item}>
                <TouchableView
                    style={styles.flat_item_touchableview}
                    onPress={()=>{
                        jumpPager(this.props.navigation.navigate,'MovieDetail',item.id)
                    }}>
                    <View style={[styles.flat_item_view,{backgroundColor: this.state.MainColor}]}>
                        <Image
                            source={{uri:item.images.large}}
                            style={styles.flat_item_image}/>
                        <View style={[styles.flat_item_detail,{backgroundColor: this.state.MainColor}]}>
                            <Text style={styles.flat_item_title}
                                  numberOfLines={1}>
                                {item.title}
                            </Text>
                            <View style={styles.flat_item_rating_view}>
                                <StarRating
                                    disabled={false}
                                    rating={item.rating.average/2}
                                    maxStars={5}
                                    halfStarEnabled={true}
                                    emptyStar={require('../../data/img/icon_unselect.png')}
                                    halfStar={require('../../data/img/icon_half_select.png')}
                                    fullStar={require('../../data/img/icon_selected.png')}
                                    starStyle={{width: 14, height: 14}}
                                    selectedStar={(rating)=>{}}/>
                                <Text style={styles.flat_item_rating_number} numberOfLines={1}>{item.rating.average.toFixed(1)}</Text>
                            </View>
                        </View>
                    </View>
                </TouchableView>
            </View>
        )
    }

    _refreshControlView() {
        return (
            <RefreshControl
                refreshing={this.state.refreshing}
                onRefresh={() => this._refresh()}
                colors={['#ff0000', '#00ff00', '#0000ff']}
            />
        )
    }

    _refresh() {
        this.setState({
            refreshing: true
        })
        this.requestData()
    }

    _getContentView() {
        if (this.state.isInit) {
            return (
                <View style={styles.content_view}>
                    {/*banner栏*/}
                    <View style={styles.middle_view}>
                        <View style={styles.swiper}>
                            <Swiper
                                height={220}
                                autoplay={true}
                                autoplayTimeout={4}
                                dot = {<View style={styles.swiper_dot}/>}
                                activeDot = {<View style={styles.swiper_activeDot}/>}
                                paginationStyle={styles.swiper_pagination}>
                                {this._swiperChildrenView()}
                            </Swiper>
                        </View>
                        {/*分类栏*/}
                        <View style={[styles.cate_view,{backgroundColor: this.state.MainColor,}]}>
                            {this._cateChildrenView()}
                        </View>
                    </View>
                    {/*列表*/}
                    <View style={styles.flat_view}>
                        <FlatList
                            data = {this.getHotMovieDatas(false)}
                            keyExtractor={(item,index)=>index}
                            renderItem={
                                ({item}) => this._renderItemView(item)
                            }
                            getItemLayout={(data,index)=> this._getItemLayout(data,index)}
                            showsVerticalScrollIndicator={false}
                            numColumns={3}
                        />
                    </View>
                </View>
            )
        } else {
            <View style={styles.content_view}/>
        }
    }

    _getItemLayout(data, index) {
        return {length: itemHight,offset: itemHight*index,index}
    }

    getHotMovieDatas (isBanner) {
        let items = [];
        let movieDatas = this.state.hotMovies.subjects;
        if (movieDatas != null && movieDatas.length>4) {
            if (isBanner) {
                for (let i = 0; i < 4; i++) {
                    items.push(movieDatas[i]);
                }
            } else {
                for (let i = 4; i < movieDatas.length; i++) {
                    items.push(movieDatas[i]);
                }
            }
        }
        return items;
    }

    render() {
        const {isUpdate} = this.state
        if(!isUpdate){
            return (
                <View style={styles.container}>
                    <StatusBar
                        animated = {true}
                        backgroundColor = {this.state.MainColor}
                        barStyle = 'light-content'
                    />
                    <NaviBarView backgroundColor={this.state.MainColor}/>
                    <View style={[styles.toolbar,{backgroundColor:this.state.MainColor}]}>
                        <TouchableOpacity
                            onPress={()=>{
                                jumpPager(this.props.navigation.navigate,"Theme",this.onChangeTheme.bind(this))
                            }}>
                            <Image
                                source={require('../../data/img/icon_theme.png')}
                                style={styles.toolbar_left_img}
                                tintColor={White}/>
                        </TouchableOpacity>
                        <View style={styles.toolbar_middle}>
                            <Text style={styles.toolbar_middle_text}>六閤电影</Text>
                        </View>
                        <TouchableOpacity
                            onPress={()=>{
                                jumpPager(this.props.navigation.navigate,"Search",null)
                            }}>
                            <Image
                                source={require('../../data/img/icon_search.png')}
                                style={styles.toolbar_right_img}
                                tintColor={White}/>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.scrollview_container}
                                showsVerticalScrollIndicator={false}
                                refreshControl={this._refreshControlView()}>
                        {this._getContentView()}
                    </ScrollView>
                    {/* <WebView 
                        source={{uri: url}}
                        startInLoadingState={true}
                        scalesPageToFit={true}
                        renderLoading={this._renderLoading}
                    />  */}
             </View>
            )
         }
         else {
             return (
                this._modalView()
             )
         }
        
               
        
    }
    _renderLoading=()=>{
        return <ImageBackground 
                 source={require('../../data/img/icon_spash750-1334.png')}
                 style={styles.centering}>
                    <Spinner
                        isVisible
                        size={80}
                        type='ThreeBounce'
                        color={MainBg}
                    />
        </ImageBackground>
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: MainBg
    },
    centering: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cccccc',
    },
    codepushContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
      },
      codepushWelcome: {
          fontSize: 18,
          textAlign: 'center',
          margin: 10,
          color: '#fff',
      },
      codePushText: {
          fontSize: 16,
          textAlign: 'center',
          color: '#fff',
          marginBottom: 5,
      },
      progressStyle: {
          margin: 5,
          marginTop:15,
          alignSelf:'center'
      },
    toolbar: {
        height:56,
        width:width,
        alignItems: 'center',
        flexDirection: 'row',
    },
    toolbar_left_img:{
        width:26,
        height:26,
        alignSelf: 'center',
        marginLeft: 20,
    },
    toolbar_middle: {
        flex:1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolbar_middle_text: {
        fontSize: 18,
        fontWeight: '600',
        color:White
    },
    toolbar_right_img: {
        width:26,
        height:26,
        alignSelf: 'center',
        marginRight: 20,
    },
    scrollview_container: {
        flex: 1,
    },
    content_view: {
        flex: 1,
    },
    middle_view: {
        backgroundColor: WhiteTextColor,
        paddingBottom: 10,
        borderBottomLeftRadius:4,
        borderBottomRightRadius:4,
    },
    swiper: {
        height: 220,
    },
    swiper_dot: {
        backgroundColor: Translucent,
        width: 16,
        height: 2,
        borderRadius: 1,
        marginLeft: 2,
        marginRight: 2,
    },
    swiper_activeDot: {
        backgroundColor: WhiteTextColor,
        width: 16,
        height: 2,
        borderRadius: 1,
        marginLeft: 2,
        marginRight: 2,
    },
    swiper_pagination: {
        justifyContent: 'flex-end',
        marginRight: 20,
    },
    swiper_children_view: {
        height: 200,
        flexDirection: 'row',
        alignItems: 'center',
        margin :10,
        paddingLeft:10,
        paddingRight: 10,
        borderRadius: 6,
    },
    swiper_children_cover: {
        width: 112,
        height: 180,
        borderRadius: 4,
    },
    swiper_children_right: {
        marginTop: 20,
        height: 180,
        marginLeft: 20,
    },
    swiper_children_title: {
        fontSize: 18,
        marginBottom: 10,
        color: WhiteTextColor
    },
    swiper_children_director: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    swiper_children_director_img: {
        width: 26,
        height: 26,
        borderRadius: 13,
        marginRight: 8,
    },
    swiper_children_director_name: {
        fontSize: 14,
        color: GrayWhiteColor
    },
    swiper_children_casts_view: {
        width: width-190,
        marginBottom: 10,
    },
    swiper_children_casts_text: {
        fontSize:14,
        flexWrap: 'wrap',
        color: GrayWhiteColor
    },
    swiper_children_rating_view: {
        flexDirection: 'row',
        marginBottom: 10,
        alignItems: 'center',
    },
    swiper_children_rating_text: {
        fontSize: 14,
        color: '#ffcc33',
        fontWeight: '500',
        marginLeft: 8,
    },
    swiper_children_genres_view: {
        width: width-190,
        marginBottom: 10,
    },
    swiper_children_genres_text: {
        fontSize:14,
        flexWrap: 'wrap',
        color: GrayWhiteColor,
    },
    cate_view: {
        height: 72,
        flexDirection: 'row',
        marginLeft: 10,
        marginRight: 10,
        borderRadius: 4,
    },
    cate_children_touchview: {
        width: (width-20)/4,
        height: 72,
    },
    cate_children_view: {
        width: (width-20)/4,
        height: 72,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cate_children_linear: {
        width: 42,
        height: 42,
        borderRadius: 26,
        marginBottom:4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cate_children_image: {
        width: 26,
        height: 26,
    },
    cate_children_text: {
        fontSize: 14,
        color: WhiteTextColor,
    },
    flat_view: {
        flex: 1,
        marginLeft:5,
        marginRight:5,
        backgroundColor: GrayWhiteColor,
    },
    flat_item: {
        height: itemHight,
        width:(width-10)/3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    flat_item_touchableview: {
        height: itemHight-16,
    },
    flat_item_view: {
        height: itemHight-16,
        alignItems: 'center',
        borderRadius: 4,
    },
    flat_item_image: {
        width: (width-10)/3-10,
        height:itemHight-26,
        borderRadius: 4,
    },
    flat_item_detail: {
        width: (width-10)/3-10,
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
        padding: 2,
        borderBottomRightRadius:4,
        borderBottomLeftRadius:4,
    },
    flat_item_title: {
        fontSize: 14,
        color: WhiteTextColor,
    },
    flat_item_rating_view: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flat_item_rating_number: {
        fontSize: 12,
        color: '#ffcc33',
        fontWeight: '500',
        marginLeft: 4,
    },
})